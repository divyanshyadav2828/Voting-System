const keys = require('../config/keys');

// Middleware to check email domain after SSO authentication
// This is used inside the passport callback, not as route middleware
module.exports = {
  isDomainAllowed: (email) => {
    if (!email) return false;
    const domain = email.split('@')[1];
    return domain && domain.toLowerCase() === keys.allowedDomain.toLowerCase();
  },
};
