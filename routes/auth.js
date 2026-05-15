const router = require('express').Router();
const passport = require('passport');

// @route  GET /login
// @desc   Show login page
router.get('/login', (req, res) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'user') {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Sign In' });
});

// ─── Microsoft SSO ──────────────────────────────────────────

// @route  GET /auth/microsoft
// @desc   Redirect to Microsoft SSO
router.get(
  '/auth/microsoft',
  (req, res, next) => {
    const keys = require('../config/keys');
    if (!keys.enableMicrosoftLogin) {
      req.flash('error_msg', 'Microsoft Login is currently disabled.');
      return res.redirect('/login');
    }
    next();
  },
  passport.authenticate('microsoft', { prompt: 'select_account' })
);

// @route  GET /auth/microsoft/callback
// @desc   Microsoft SSO callback
router.get(
  '/auth/microsoft/callback',
  passport.authenticate('microsoft', {
    failureRedirect: '/unauthorized',
    failureFlash: true,
  }),
  (req, res) => {
    req.session.authMethod = 'microsoft';
    res.redirect('/dashboard');
  }
);

// ─── LDAP Login ─────────────────────────────────────────────

// @route  POST /auth/ldap
// @desc   Authenticate via LDAP
router.post('/auth/ldap', (req, res, next) => {
  const keys = require('../config/keys');
  if (!keys.enableLdapLogin) {
    req.flash('error_msg', 'LDAP Login is currently disabled.');
    return res.redirect('/login');
  }
  passport.authenticate('ldap', (err, user, info) => {
    if (res.headersSent) return;
    if (err) {
      console.error('LDAP auth error:', err.message);
      req.flash('error_msg', 'LDAP server connection failed. Please try Microsoft SSO or contact IT support.');
      return res.redirect('/login');
    }
    if (!user) {
      req.flash('error_msg', (info && info.message) || 'Invalid LDAP credentials.');
      return res.redirect('/login');
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        req.flash('error_msg', 'Login failed. Please try again.');
        return res.redirect('/login');
      }
      req.session.authMethod = 'ldap';
      return res.redirect('/dashboard');
    });
  })(req, res, next);
});

// ─── Common Routes ──────────────────────────────────────────

// @route  GET /unauthorized
// @desc   Show unauthorized domain page
router.get('/unauthorized', (req, res) => {
  res.render('unauthorized', { title: 'Unauthorized' });
});

// @route  GET /auth/logout
// @desc   Logout user and perform true SSO logout if Microsoft
router.get('/auth/logout', (req, res, next) => {
  // Capture provider from the current session
  const authMethod = req.session.authMethod || (req.user ? req.user.authProvider : null);

  req.logout((err) => {
    if (err) return next(err);
    
    req.flash('success_msg', 'You have been logged out of the portal.');

    // If the user signed in via Microsoft during this session, perform Azure AD logout
    if (authMethod === 'microsoft') {
      const keys = require('../config/keys');
      const tenantId = keys.microsoft.tenantID || 'common';
      const logoutRedirectUri = encodeURIComponent(`${req.protocol}://${req.get('host')}/login`);
      
      return res.redirect(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${logoutRedirectUri}`
      );
    }

    // Otherwise (like LDAP or Admin local login), just redirect normally
    res.redirect('/login');
  });
});

module.exports = router;
