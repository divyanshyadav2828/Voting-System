const router = require('express').Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const keys = require('../config/keys');

// IP Filter Middleware for Logs Portal
const checkLogsIP = (req, res, next) => {
  const allowedIPs = keys.logsPortal.allowedIPs;
  if (!allowedIPs || allowedIPs.length === 0) return next();

  let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (clientIp && clientIp.includes(',')) clientIp = clientIp.split(',')[0].trim();
  if (clientIp === '::1') clientIp = '127.0.0.1';
  else if (clientIp && clientIp.startsWith('::ffff:')) clientIp = clientIp.split(':').pop();

  if (allowedIPs.includes(clientIp)) {
    next();
  } else {
    console.warn(`Blocked logs access from unauthorized IP: ${clientIp}`);
    res.status(403).render('error', {
      title: 'Access Denied',
      message: 'Your IP address is not authorized to access the logs portal.',
    });
  }
};

// Apply IP filter to all routes in this router
router.use(checkLogsIP);

// @route  GET /logs
// @desc   Show logs login or dashboard
router.get('/', (req, res) => {
  if (req.session.logsAuthenticated) {
    return res.render('logs', { title: 'Live Session Logs', authenticated: true });
  }
  res.render('logs', { title: 'Logs Authentication', authenticated: false, logsError: null });
});

// @route  POST /logs/login
// @desc   Authenticate logs portal
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === keys.logsPortal.username && password === keys.logsPortal.password) {
    req.session.logsAuthenticated = true;
    return res.redirect('/logs');
  }
  res.render('logs', { title: 'Logs Authentication', authenticated: false, logsError: 'Invalid credentials.' });
});

// @route  GET /logs/api
// @desc   Fetch live sessions
router.get('/api', async (req, res) => {
  if (!req.session.logsAuthenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const sessions = await mongoose.connection.db.collection('sessions').find().toArray();
    const activeUsers = [];

    for (const sessionDoc of sessions) {
      if (!sessionDoc.session) continue;
      
      let sessionData = {};
      try {
        sessionData = JSON.parse(sessionDoc.session);
      } catch (e) {
        continue;
      }

      // Check if user is logged in
      if (sessionData && sessionData.passport && sessionData.passport.user) {
        const userId = sessionData.passport.user.id;
        const role = sessionData.passport.user.role;
        const ip = sessionData.ip || 'Unknown';
        
        // We only care about voters (role === 'user') to show Display Name/Username
        if (role === 'user') {
          const user = await User.findById(userId).lean();
          if (user) {
            activeUsers.push({
              ip,
              displayName: user.displayName || 'Unknown',
              username: user.email || user.ldapUid || 'Unknown',
              authMethod: sessionData.authMethod || user.authProvider || 'Unknown',
              lastActive: sessionDoc.expires,
            });
          }
        }
      }
    }

    res.json(activeUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route  GET /logs/logout
// @desc   Logout of logs portal
router.get('/logout', (req, res) => {
  req.session.logsAuthenticated = false;
  res.redirect('/logs');
});

module.exports = router;
