const router = require('express').Router();
const Post = require('../models/Post');
const Vote = require('../models/Vote');

// @route  GET /results
// @desc   Show results for published elections
router.get('/', async (req, res) => {
  try {
    // Only fetch posts where results have been published by the admin
    const publishedPosts = await Post.find({ isResultsPublished: true }).sort({ createdAt: -1 });
    
    // Calculate statistics just like dashboard
    const analytics = [];
    for (const post of publishedPosts) {
      const votes = await Vote.find({ post: post._id });
      const totalVotes = votes.length;

      const candidateStats = post.candidates.map((c) => {
        const count = votes.filter((v) => v.candidateId.toString() === c._id.toString()).length;
        const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : 0;
        return {
          name: c.name,
          id: c._id,
          votes: count,
          percentage,
        };
      });

      // Sort by votes desc
      candidateStats.sort((a, b) => b.votes - a.votes);
      const leader = candidateStats.length > 0 ? candidateStats[0] : null;

      analytics.push({
        post,
        totalVotes,
        candidateStats,
        leader,
      });
    }

    res.render('results', {
      title: 'Election Results',
      user: req.user || null, // Optional, for header layout
      analytics,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Server Error', message: 'Unable to load results.' });
  }
});

module.exports = router;
