// Ensure the user is authenticated via Microsoft SSO
module.exports = {
  ensureAuthenticated: (req, res, next) => {
    if (req.isAuthenticated() && req.user && req.user.role === 'user') {
      return next();
    }
    req.flash('error_msg', 'Please log in to access this page.');
    res.redirect('/login');
  },
};
