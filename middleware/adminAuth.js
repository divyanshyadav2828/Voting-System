// Ensure the user is authenticated as an admin
module.exports = {
  ensureAdmin: (req, res, next) => {
    if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
      return next();
    }
    req.flash('error_msg', 'Please log in as admin to access this page.');
    res.redirect('/vote_admin/login');
  },
};
