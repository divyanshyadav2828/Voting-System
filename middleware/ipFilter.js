const keys = require('../config/keys');

module.exports = {
  checkIP: (req, res, next) => {
    if (keys.ipFilter.mode === 'ALL') {
      return next();
    }

    // Get client IP address
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Process multiple IPs if behind proxy
    if (clientIp && clientIp.includes(',')) {
      clientIp = clientIp.split(',')[0].trim();
    }

    // Normalize IPv6 localhost (::1) and IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (clientIp === '::1') {
      clientIp = '127.0.0.1';
    } else if (clientIp && clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.split(':').pop();
    }

    if (keys.ipFilter.mode === 'SPECIFIC') {
      // Allow if the client IP is in the allowed list
      if (keys.ipFilter.allowedIPs.includes(clientIp)) {
        return next();
      } else {
        return res.status(403).send(`
          <html>
            <head><title>Access Denied</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
              <h1>403 Forbidden</h1>
              <p>Access Denied: Your IP address (${clientIp}) is not authorized to access this portal.</p>
            </body>
          </html>
        `);
      }
    }

    // Default reject if mode is unrecognized
    return res.status(403).send('Access Denied: Invalid IP filter configuration.');
  }
};
