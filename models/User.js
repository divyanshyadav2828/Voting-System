const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  microsoftId: {
    type: String,
    sparse: true,
    unique: true,
  },
  ldapUid: {
    type: String,
    sparse: true,
    unique: true,
  },
  authProvider: {
    type: String,
    enum: ['microsoft', 'ldap'],
    required: true,
    default: 'microsoft',
  },
  displayName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);
