const router = require('express').Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Post = require('../models/Post');
const Vote = require('../models/Vote');

// @route  GET /dashboard
// @desc   Show active voting posts with user's vote status
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const posts = await Post.find({ isActive: true }).sort({ createdAt: -1 });

    // Get all votes by this user
    const userVotes = await Vote.find({ voter: req.user._id });
    const votedPostIds = userVotes.map((v) => v.post.toString());
    const voteMap = {};
    userVotes.forEach((v) => {
      voteMap[v.post.toString()] = v.candidateName;
    });

    res.render('dashboard', {
      title: 'Voting Dashboard',
      user: req.user,
      posts,
      votedPostIds,
      voteMap,
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Something went wrong loading posts.');
    res.redirect('/login');
  }
});

// @route  POST /vote/:postId
// @desc   Cast a vote for a candidate
router.post('/vote/:postId', ensureAuthenticated, async (req, res) => {
  try {
    const { postId } = req.params;
    const { candidateId } = req.body;

    // Validate post exists and is active
    const post = await Post.findOne({ _id: postId, isActive: true });
    if (!post) {
      req.flash('error_msg', 'This voting post is no longer active.');
      return res.redirect('/dashboard');
    }

    // Validate candidate exists in post
    const candidate = post.candidates.id(candidateId);
    if (!candidate) {
      req.flash('error_msg', 'Invalid candidate selected.');
      return res.redirect('/dashboard');
    }

    // Check if already voted (application level)
    const existingVote = await Vote.findOne({ voter: req.user._id, post: postId });
    if (existingVote) {
      req.flash('error_msg', 'You have already voted for this post.');
      return res.redirect('/dashboard');
    }

    // Create vote (DB unique index provides additional safety)
    const fs = require('fs');
    const path = require('path');
    let weight = Number(process.env.students) || 1;
    try {
      const teachersPath = path.join(__dirname, '..', 'teachers.csv');
      if (fs.existsSync(teachersPath)) {
        const teachers = fs.readFileSync(teachersPath, 'utf8').split('\n').map(l => l.trim().toLowerCase());
        const email = req.user.email ? req.user.email.toLowerCase() : '';
        const uid = email.split('@')[0];
        const ldapUid = req.user.ldapUid ? req.user.ldapUid.toLowerCase() : '';
        if (teachers.includes(uid) || teachers.includes(email) || teachers.includes(ldapUid)) {
          weight = Number(process.env.teachers) || 2;
        }
      }
    } catch (e) {
      console.error('Error reading teachers.csv for vote weight', e);
    }

    await Vote.create({
      voter: req.user._id,
      post: postId,
      candidateId: candidate._id,
      candidateName: candidate.name,
      weight: weight,
    });

    req.flash('success_msg', `Your vote for "${candidate.name}" in "${post.title}" has been recorded!`);
    res.redirect('/dashboard');
  } catch (err) {
    // Handle duplicate key error (double vote at DB level)
    if (err.code === 11000) {
      req.flash('error_msg', 'You have already voted for this post.');
      return res.redirect('/dashboard');
    }
    console.error(err);
    req.flash('error_msg', 'Something went wrong casting your vote.');
    res.redirect('/dashboard');
  }
});

module.exports = router;
