const express = require('express');
const router  = express.Router();
const path    = require('path');
const multer  = require('multer');
const User    = require('../models/User');
const Post    = require('../models/Post');
const requireAuth = require('../middleware/auth');

// Multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${Date.now()}${ext}`);
  }
});
const avatarFilter = (req, file, cb) => {
  const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase());
  ok ? cb(null, true) : cb(new Error('Images only'));
};
const uploadAvatar = multer({ storage: avatarStorage, fileFilter: avatarFilter, limits: { fileSize: 3 * 1024 * 1024 } });

// Search users
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = await User.find({ username: { $regex: q, $options: 'i' } })
      .select('username avatar bio')
      .limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user  = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const posts = await Post.find({ author: req.params.id })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate('comments.author', 'username avatar');
    res.json({ user, posts });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Follow / Unfollow
router.post('/:id/follow', requireAuth, async (req, res) => {
  try {
    if (req.params.id === req.session.userId.toString())
      return res.status(400).json({ error: 'Cannot follow yourself' });

    const target = await User.findById(req.params.id);
    const me     = await User.findById(req.session.userId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const isFollowing = me.following.map(f => f.toString()).includes(req.params.id);
    if (isFollowing) {
      me.following      = me.following.filter(f => f.toString() !== req.params.id);
      target.followers  = target.followers.filter(f => f.toString() !== req.session.userId.toString());
    } else {
      me.following.push(target._id);
      target.followers.push(me._id);
    }
    await me.save();
    await target.save();
    res.json({ following: !isFollowing, followerCount: target.followers.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile (bio + optional avatar)
router.patch('/me/profile', requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const update = {};
    if (req.body.bio !== undefined) update.bio = req.body.bio;
    if (req.file) {
      // delete old avatar file if it exists
      const existing = await User.findById(req.session.userId).select('avatar');
      if (existing.avatar && existing.avatar.startsWith('/uploads/')) {
        const fs = require('fs');
        fs.unlink(path.join(__dirname, '../public', existing.avatar), () => {});
      }
      update.avatar = `/uploads/${req.file.filename}`;
    }
    const user = await User.findByIdAndUpdate(req.session.userId, update, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get followers list
router.get('/:id/followers', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('followers', 'username avatar bio');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.followers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get following list
router.get('/:id/following', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('following', 'username avatar bio');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.following);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
