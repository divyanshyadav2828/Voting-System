const passport = require('passport');
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const LdapStrategy = require('passport-ldapauth');
const bcrypt = require('bcryptjs');
const keys = require('./keys');
const User = require('../models/User');
const Admin = require('../models/Admin');
const fs = require('fs');
const path = require('path');

const checkUserInCSV = (identifier) => {
  try {
    const teachersPath = path.join(__dirname, '..', 'teachers.csv');
    const studentsPath = path.join(__dirname, '..', 'students.csv');
    let teachers = [];
    let students = [];
    if (fs.existsSync(teachersPath)) {
      teachers = fs.readFileSync(teachersPath, 'utf8').split('\n').map(line => line.trim().toLowerCase()).filter(Boolean);
    }
    if (fs.existsSync(studentsPath)) {
      students = fs.readFileSync(studentsPath, 'utf8').split('\n').map(line => line.trim().toLowerCase()).filter(Boolean);
    }
    return teachers.includes(identifier.toLowerCase()) || students.includes(identifier.toLowerCase());
  } catch (err) {
    console.error('Error reading CSV files:', err);
    return false;
  }
};

// ─── Serialization ──────────────────────────────────────────
// We store role + id so we can deserialize the right model
passport.serializeUser((entity, done) => {
  if (entity.role === 'admin') {
    done(null, { id: entity._id, role: 'admin' });
  } else {
    done(null, { id: entity._id, role: 'user' });
  }
});

passport.deserializeUser(async (obj, done) => {
  try {
    if (obj.role === 'admin') {
      const admin = await Admin.findById(obj.id).lean();
      if (admin) admin.role = 'admin';
      done(null, admin);
    } else {
      const user = await User.findById(obj.id).lean();
      if (user) user.role = 'user';
      done(null, user);
    }
  } catch (err) {
    done(err, null);
  }
});

// ─── Microsoft SSO Strategy ────────────────────────────────
passport.use(
  new MicrosoftStrategy(
    {
      clientID: keys.microsoft.clientID,
      clientSecret: keys.microsoft.clientSecret,
      callbackURL: keys.microsoft.callbackURL,
      tenant: keys.microsoft.tenantID,
      scope: ['user.read'],
      authorizationURL: `https://login.microsoftonline.com/${keys.microsoft.tenantID}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${keys.microsoft.tenantID}/oauth2/v2.0/token`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          (profile.emails && profile.emails.length > 0 && profile.emails[0].value) ||
          profile._json.mail ||
          profile._json.userPrincipalName ||
          '';

        const displayName = profile.displayName || 'Unknown User';
        const microsoftId = profile.id;

        // Check domain
        const domain = email.split('@')[1];
        if (domain && domain.toLowerCase() !== keys.allowedDomain.toLowerCase()) {
          return done(null, false, { message: 'Unauthorized domain. Only @' + keys.allowedDomain + ' emails are allowed.' });
        }

        // Find or create user
        let user = await User.findOne({ microsoftId });
        if (user) {
          user.displayName = displayName;
          user.email = email.toLowerCase();
          await user.save();
        } else {
          // Check if user exists by email (may have signed in via LDAP before)
          user = await User.findOne({ email: email.toLowerCase() });
          if (user) {
            user.microsoftId = microsoftId;
            user.displayName = displayName;
            user.authProvider = 'microsoft';
            await user.save();
          } else {
            user = await User.create({
              microsoftId,
              displayName,
              email: email.toLowerCase(),
              authProvider: 'microsoft',
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ─── LDAP Strategy ─────────────────────────────────────────
passport.use(
  'ldap',
  new LdapStrategy(
    function(req, callback) {
      const username = req.body.ldap_username || '';
      // Active Directory accepts direct UPN bind for searching
      const bindDN = username.includes('@') ? username : `${username}@${keys.allowedDomain}`;
      
      const opts = {
        passReqToCallback: true,
        server: {
          url: keys.ldap.url,
          bindDN: bindDN,
          bindCredentials: req.body.ldap_password || '',
          searchBase: keys.ldap.searchBase,
          searchFilter: keys.ldap.searchFilter,
          tlsOptions: keys.ldap.tlsOptions,
        },
        usernameField: 'ldap_username',
        passwordField: 'ldap_password',
      };
      
      callback(null, opts);
    },
    async (req, ldapUser, done) => {
      try {
        // Extract user details from LDAP response
        const ldapUid = ldapUser.uid || ldapUser.sAMAccountName || ldapUser.cn || '';
        const displayName =
          ldapUser.displayName ||
          ldapUser.cn ||
          (ldapUser.givenName && ldapUser.sn ? `${ldapUser.givenName} ${ldapUser.sn}` : '') ||
          ldapUid;
        const email =
          ldapUser.mail ||
          ldapUser.userPrincipalName ||
          ldapUser.email ||
          `${ldapUid}@${keys.allowedDomain}`;

        // Check domain
        const domain = email.split('@')[1];
        if (domain && domain.toLowerCase() !== keys.allowedDomain.toLowerCase()) {
          return done(null, false, { message: 'Unauthorized domain. Only @' + keys.allowedDomain + ' emails are allowed.' });
        }

        // Check CSV
        const uid = email.split('@')[0];
        if (!checkUserInCSV(uid) && !checkUserInCSV(email) && !(typeof ldapUid !== 'undefined' && checkUserInCSV(ldapUid))) {
          return done(null, false, { message: 'Unauthorized. You are not on the voter list.' });
        }

        // Find or create user
        let user = await User.findOne({ ldapUid });
        if (user) {
          user.displayName = displayName;
          user.email = email.toLowerCase();
          await user.save();
        } else {
          // Check if user exists by email (may have signed in via Microsoft before)
          user = await User.findOne({ email: email.toLowerCase() });
          if (user) {
            user.ldapUid = ldapUid;
            user.displayName = displayName;
            await user.save();
          } else {
            user = await User.create({
              ldapUid,
              displayName,
              email: email.toLowerCase(),
              authProvider: 'ldap',
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ─── Local Strategy (Admin) ────────────────────────────────
passport.use(
  'local-admin',
  new LocalStrategy(
    { usernameField: 'username', passwordField: 'password' },
    async (username, password, done) => {
      try {
        const admin = await Admin.findOne({ username: username.toLowerCase() });
        if (!admin) {
          return done(null, false, { message: 'Invalid credentials.' });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid credentials.' });
        }
        admin.role = 'admin';
        return done(null, admin);
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;
