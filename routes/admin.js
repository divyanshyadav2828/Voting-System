const router = require('express').Router();
const passport = require('passport');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { ensureAdmin } = require('../middleware/adminAuth');
const Post = require('../models/Post');
const Vote = require('../models/Vote');
const User = require('../models/User');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'candidate-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const deleteFile = (filePath) => {
  if (!filePath || filePath.startsWith('http')) return;
  const fullPath = path.join(__dirname, '..', 'public', filePath);
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } catch (e) { console.error('Error deleting file', e); }
  }
};

// ─── Admin Login ────────────────────────────────────────────

// @route  GET /vote_admin/login
router.get('/login', (req, res) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return res.redirect('/vote_admin/dashboard');
  }
  res.render('admin/login', { title: 'Admin Login' });
});

// @route  POST /vote_admin/login
router.post('/login', (req, res, next) => {
  passport.authenticate('local-admin', {
    successRedirect: '/vote_admin/dashboard',
    failureRedirect: '/vote_admin/login',
    failureFlash: true,
  })(req, res, next);
});

// @route  GET /vote_admin/logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success_msg', 'Logged out of admin panel.');
    res.redirect('/vote_admin/login');
  });
});

// ─── Admin Dashboard (Analytics) ───────────────────────────

// @route  GET /vote_admin/dashboard
router.get('/dashboard', ensureAdmin, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    const totalUsers = await User.countDocuments();

    // Build analytics for each post
    const analytics = [];
    for (const post of posts) {
      const votes = await Vote.find({ post: post._id });
      const totalVotes = votes.length;
      const totalWeightedVotes = votes.reduce((sum, v) => sum + (v.weight || 1), 0);

      const candidateStats = post.candidates.map((c) => {
        const candidateVotes = votes.filter((v) => v.candidateId.toString() === c._id.toString());
        const count = candidateVotes.length;
        const weightedCount = candidateVotes.reduce((sum, v) => sum + (v.weight || 1), 0);
        const percentage = totalWeightedVotes > 0 ? ((weightedCount / totalWeightedVotes) * 100).toFixed(1) : 0;
        return {
          name: c.name,
          id: c._id,
          votes: count,
          weightedVotes: weightedCount,
          percentage,
        };
      });

      // Sort by weightedVotes desc
      candidateStats.sort((a, b) => b.weightedVotes - a.weightedVotes);
      const leader = candidateStats.length > 0 ? candidateStats[0] : null;

      analytics.push({
        post,
        totalVotes,
        totalWeightedVotes,
        candidateStats,
        leader,
      });
    }

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      analytics,
      totalUsers,
      totalPosts: posts.length,
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading analytics.');
    res.redirect('/vote_admin/login');
  }
});

// ─── Manage Posts ───────────────────────────────────────────

// @route  GET /vote_admin/posts
router.get('/posts', ensureAdmin, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.render('admin/posts', { title: 'Manage Posts', posts });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading posts.');
    res.redirect('/vote_admin/dashboard');
  }
});

// @route  GET /vote_admin/posts/new
router.get('/posts/new', ensureAdmin, (req, res) => {
  res.render('admin/post-form', { title: 'Create New Post', post: null });
});

// @route  POST /vote_admin/posts
router.post('/posts', ensureAdmin, upload.any(), async (req, res) => {
  try {
    const { title, description, candidateNames, isActive } = req.body;

    if (!title || !candidateNames || candidateNames.length === 0) {
      req.flash('error_msg', 'Title and at least one candidate are required.');
      return res.redirect('/vote_admin/posts/new');
    }

    const names = Array.isArray(candidateNames) ? candidateNames : [candidateNames];

    const candidates = names
      .map((name, i) => {
        let photoPath = '';
        const file = req.files.find(f => f.fieldname === `photo_${i}`);
        if (file) {
          photoPath = '/uploads/' + file.filename;
        }
        return {
          name: name.trim(),
          photo: photoPath,
        };
      })
      .filter((c) => c.name);

    await Post.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      candidates,
      isActive: isActive === 'on',
    });

    req.flash('success_msg', `Post "${title}" created successfully.`);
    res.redirect('/vote_admin/posts');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error creating post.');
    res.redirect('/vote_admin/posts/new');
  }
});

// @route  GET /vote_admin/posts/:id/edit
router.get('/posts/:id/edit', ensureAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      req.flash('error_msg', 'Post not found.');
      return res.redirect('/vote_admin/posts');
    }
    res.render('admin/post-form', { title: 'Edit Post', post });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading post.');
    res.redirect('/vote_admin/posts');
  }
});

// @route  PUT /vote_admin/posts/:id
router.put('/posts/:id', ensureAdmin, upload.any(), async (req, res) => {
  try {
    const { title, description, candidateNames, isActive } = req.body;

    const names = Array.isArray(candidateNames) ? candidateNames : [candidateNames];

    const post = await Post.findById(req.params.id);
    if (!post) {
      req.flash('error_msg', 'Post not found.');
      return res.redirect('/vote_admin/posts');
    }

    // Map over submitted candidates to track used old photos
    const newUsedPhotos = [];

    const candidates = names
      .map((name, i) => {
        let photoPath = req.body[`oldPhoto_${i}`] || '';
        const file = req.files.find(f => f.fieldname === `photo_${i}`);
        
        if (file) {
          // New file uploaded, we will delete the old photo
          if (photoPath) deleteFile(photoPath);
          photoPath = '/uploads/' + file.filename;
        }

        if (photoPath) newUsedPhotos.push(photoPath);

        return {
          name: name.trim(),
          photo: photoPath,
        };
      })
      .filter((c) => c.name);

    // Any old photos that are no longer used should be deleted
    post.candidates.forEach(oldC => {
      if (oldC.photo && !newUsedPhotos.includes(oldC.photo)) {
        deleteFile(oldC.photo);
      }
    });

    await Post.findByIdAndUpdate(req.params.id, {
      title: title.trim(),
      description: description ? description.trim() : '',
      candidates,
      isActive: isActive === 'on',
    });

    req.flash('success_msg', 'Post updated successfully.');
    res.redirect('/vote_admin/posts');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating post.');
    res.redirect('/vote_admin/posts');
  }
});

// @route  POST /vote_admin/posts/:id/toggle-results
router.post('/posts/:id/toggle-results', ensureAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      req.flash('error_msg', 'Post not found.');
      return res.redirect('/vote_admin/posts');
    }
    
    post.isResultsPublished = !post.isResultsPublished;
    await post.save();
    
    req.flash('success_msg', post.isResultsPublished ? 'Results are now LIVE.' : 'Results are now HIDDEN.');
    res.redirect('/vote_admin/posts');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error toggling results.');
    res.redirect('/vote_admin/posts');
  }
});

// @route  DELETE /vote_admin/posts/:id
router.delete('/posts/:id', ensureAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post) {
      post.candidates.forEach(c => {
        if (c.photo) deleteFile(c.photo);
      });
      await Post.findByIdAndDelete(req.params.id);
    }
    await Vote.deleteMany({ post: req.params.id });
    req.flash('success_msg', 'Post and associated votes deleted.');
    res.redirect('/vote_admin/posts');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error deleting post.');
    res.redirect('/vote_admin/posts');
  }
});

// ─── Audit Trail ────────────────────────────────────────────

// @route  GET /vote_admin/audit
router.get('/audit', ensureAdmin, async (req, res) => {
  try {
    const { postId } = req.query;
    const filter = postId ? { post: postId } : {};
    const votes = await Vote.find(filter)
      .populate('voter', 'email displayName')
      .populate('post', 'title')
      .sort({ createdAt: -1 });

    const posts = await Post.find().sort({ title: 1 });

    res.render('admin/audit', {
      title: 'Audit Trail',
      votes,
      posts,
      selectedPostId: postId || '',
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading audit trail.');
    res.redirect('/vote_admin/dashboard');
  }
});

// @route  GET /vote_admin/audit/export
router.get('/audit/export', ensureAdmin, async (req, res) => {
  try {
    const { postId } = req.query;
    const filter = postId ? { post: postId } : {};
    const votes = await Vote.find(filter)
      .populate('voter', 'email displayName')
      .populate('post', 'title')
      .sort({ createdAt: -1 });

    let csv = 'Student Email,Student Name,Position,Voted For,Timestamp\n';
    votes.forEach(vote => {
      const email = vote.voter ? vote.voter.email : 'Deleted User';
      const name = vote.voter ? `"${vote.voter.displayName}"` : '—';
      const position = vote.post ? `"${vote.post.title}"` : 'Deleted Post';
      const candidate = `"${vote.candidateName}"`;
      const timestamp = `"${new Date(vote.createdAt).toLocaleString('en-IN')}"`;
      csv += `${email},${name},${position},${candidate},${timestamp}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="votes-export.csv"');
    res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error exporting data.');
    res.redirect('/vote_admin/audit');
  }
});

// ─── Manage Users (CSV) ──────────────────────────────────────

// @route  GET /vote_admin/users
router.get('/users', ensureAdmin, (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  let teachersText = '';
  let studentsText = '';
  
  try {
    const teachersPath = path.join(__dirname, '..', 'teachers.csv');
    if (fs.existsSync(teachersPath)) teachersText = fs.readFileSync(teachersPath, 'utf8');
    
    const studentsPath = path.join(__dirname, '..', 'students.csv');
    if (fs.existsSync(studentsPath)) studentsText = fs.readFileSync(studentsPath, 'utf8');
  } catch (err) {
    console.error('Error reading CSVs:', err);
  }
  
  res.render('admin/users', {
    title: 'Manage Users',
    teachersText,
    studentsText
  });
});

// @route  POST /vote_admin/users
router.post('/users', ensureAdmin, (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const { teachersCsv, studentsCsv } = req.body;
  
  try {
    const teachersPath = path.join(__dirname, '..', 'teachers.csv');
    fs.writeFileSync(teachersPath, teachersCsv || '');
    
    const studentsPath = path.join(__dirname, '..', 'students.csv');
    fs.writeFileSync(studentsPath, studentsCsv || '');
    
    req.flash('success_msg', 'Users updated successfully.');
  } catch (err) {
    console.error('Error writing CSVs:', err);
    req.flash('error_msg', 'Error saving user lists.');
  }
  
  res.redirect('/vote_admin/users');
});

module.exports = router;
