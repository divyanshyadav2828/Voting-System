const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  candidateName: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  weight: {
    type: Number,
    default: 1,
  },
});

// Compound unique index: one vote per user per post
VoteSchema.index({ voter: 1, post: 1 }, { unique: true });

module.exports = mongoose.model('Vote', VoteSchema);
