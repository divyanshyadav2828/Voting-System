require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/voting_app',
  sessionSecret: process.env.SESSION_SECRET || 'fallback-secret',
  microsoft: {
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'https://localhost:3000/auth/microsoft/callback',
    tenantID: process.env.MICROSOFT_TENANT_ID || 'common',
  },
  ldap: {
    url: process.env.LDAP_URL || 'ldaps://192.168.02.02:636',
    searchBase: process.env.LDAP_BASE_DN || 'dc=domainname,dc=in',
    searchFilter: `(${process.env.LDAP_USER_ATTR || 'sAMAccountName'}={{username}})`,
    tlsOptions: {
      rejectUnauthorized: false,
    },
  },
  allowedDomain: process.env.ALLOWED_DOMAIN || 'schoolname.in',
  schoolName: process.env.SCHOOL_NAME || 'School Name',
  schoolLogo: process.env.SCHOOL_LOGO_PATH || '/img/logo-white.svg',
  schoolTagline: process.env.SCHOOL_TAGLINE || 'Leadership Academy',
  useHttps: process.env.USE_HTTPS === 'true',
  sslKeyPath: process.env.SSL_KEY_PATH || 'CERTS/server.key',
  sslCertPath: process.env.SSL_CERT_PATH || 'CERTS/server.crt',
  enableMicrosoftLogin: process.env.ENABLE_MICROSOFT_LOGIN !== 'false', // Default to true
  enableLdapLogin: process.env.ENABLE_LDAP_LOGIN !== 'false',           // Default to true
  logsPortal: {
    username: process.env.LOGS_USERNAME || 'admin_logs',
    password: process.env.LOGS_PASSWORD || 'logs_pass_123',
    allowedIPs: process.env.LOGS_ALLOWED_IPS ? process.env.LOGS_ALLOWED_IPS.split(',').map(ip => ip.trim()) : [],
  },
  ipFilter: {
    mode: process.env.IP_FILTER_MODE || 'ALL',
    allowedIPs: process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim()) : [],
  },
};
