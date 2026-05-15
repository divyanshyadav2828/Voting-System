require('dotenv').config();
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const flash = require('connect-flash');
const methodOverride = require('method-override');
const passport = require('./config/passport');
const connectDB = require('./config/db');
const keys = require('./config/keys');

const app = express();
// ─── Connect to MongoDB ────────────────────────────────────
connectDB();

// ─── View Engine ────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ─────────────────────────────────────────────
app.use(require('./middleware/ipFilter').checkIP);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// ─── Sessions ───────────────────────────────────────────────
app.use(
  session({
    secret: keys.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: keys.mongoURI,
      collectionName: 'sessions',
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

// ─── IP Tracking Middleware ─────────────────────────────────
app.use((req, res, next) => {
  if (req.session) {
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (clientIp && clientIp.includes(',')) clientIp = clientIp.split(',')[0].trim();
    if (clientIp === '::1') clientIp = '127.0.0.1';
    else if (clientIp && clientIp.startsWith('::ffff:')) clientIp = clientIp.split(':').pop();
    req.session.ip = clientIp;
  }
  next();
});

// ─── Passport ───────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ─── Flash Messages ────────────────────────────────────────
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  res.locals.schoolName = keys.schoolName;
  res.locals.schoolLogo = keys.schoolLogo;
  res.locals.schoolTagline = keys.schoolTagline;
  res.locals.allowedDomain = keys.allowedDomain;
  res.locals.enableMicrosoftLogin = keys.enableMicrosoftLogin;
  res.locals.enableLdapLogin = keys.enableLdapLogin;
  next();
});

// ─── Routes ─────────────────────────────────────────────────
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/voter'));
app.use('/vote_admin', require('./routes/admin'));
app.use('/logs', require('./routes/logs'));
app.use('/results', require('./routes/results'));

// ─── Home redirect ─────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    if (req.user.role === 'admin') {
      return res.redirect('/vote_admin/dashboard');
    }
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

// ─── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 Not Found',
    message: 'The page you are looking for does not exist.',
  });
});

// ─── Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    message: 'Something went wrong on our end.',
  });
});

// ─── Start Server ──────────────────────────────────────────
const PORT = keys.port || 3000;
let server;

if (keys.useHttps) {
  // Read certificates from configured paths
  try {
    const privateKey = fs.readFileSync(path.resolve(keys.sslKeyPath), 'utf8');
    const certificate = fs.readFileSync(path.resolve(keys.sslCertPath), 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    server = https.createServer(credentials, app);
    console.log('🔒 HTTPS Mode Enabled');
  } catch (err) {
    console.error('❌ Failed to load SSL certificates. Falling back to HTTP:', err.message);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
  console.log('🔓 HTTP Mode Enabled');
}

// ─── WebSocket Server for Live Logs ───────────────────────
const { Server } = require('socket.io');
const io = new Server(server);
const mongoose = require('mongoose');
const User = require('./models/User');

const broadcastSessions = async () => {
  if (io.engine.clientsCount === 0) return; // Save DB calls if no one is viewing logs
  
  try {
    const sessions = await mongoose.connection.db.collection('sessions').find().toArray();
    const activeUsers = [];

    for (const sessionDoc of sessions) {
      if (!sessionDoc.session) continue;
      let sessionData = {};
      try { sessionData = JSON.parse(sessionDoc.session); } catch (e) { continue; }

      if (sessionData && sessionData.passport && sessionData.passport.user) {
        const userId = sessionData.passport.user.id;
        if (sessionData.passport.user.role === 'user') {
          const user = await User.findById(userId).lean();
          if (user) {
            activeUsers.push({
              ip: sessionData.ip || 'Unknown',
              displayName: user.displayName || 'Unknown',
              username: user.email || user.ldapUid || 'Unknown',
              authMethod: sessionData.authMethod || user.authProvider || 'Unknown',
            });
          }
        }
      }
    }
    io.emit('active_users', activeUsers);
  } catch (err) {
    console.error('Socket Hooks failed to fetch sessions:', err);
  }
};

io.on('connection', (socket) => {
  broadcastSessions(); // send immediate data upon connection
});

// Keep broadcasting every 3 seconds
setInterval(broadcastSessions, 3000);

// ─── Bind Server ──────────────────────────────────────────
server.listen(PORT, () => {
  const protocol = keys.useHttps ? 'https' : 'http';
  console.log(`🚀 Server running on ${protocol}://localhost:${PORT}`);
});
