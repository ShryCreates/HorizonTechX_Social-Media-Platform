const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Post = require('../models/Post');
const requireAuth = require('../middleware/auth');

// Multer config — store uploads in public/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

// Get feed (posts from followed users + own)
router.get('/feed', requireAuth, async (req, res) => {
  try {
    const User = require('../models/User');
    const me = await User.findById(req.session.userId);
    const ids = [...me.following, me._id];
    const posts = await Post.find({ author: { $in: ids } })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate('comments.author', 'username avatar');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all posts (explore)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate('comments.author', 'username avatar');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create post
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    if (!content && !req.file) return res.status(400).json({ error: 'Post needs text or an image' });
    const image = req.file ? `/uploads/${req.file.filename}` : '';
    const post = await Post.create({ author: req.session.userId, content: content || '', image });
    await post.populate('author', 'username avatar');
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Edit post (text + optional new image)
router.patch('/:id', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.session.userId.toString())
      return res.status(403).json({ error: 'Not authorized' });

    const { content, removeImage } = req.body;

    // update text if provided
    if (content !== undefined) post.content = content;

    // replace image
    if (req.file) {
      // delete old image file
      if (post.image) {
        const fs = require('fs');
        fs.unlink(path.join(__dirname, '../public', post.image), () => {});
      }
      post.image = `/uploads/${req.file.filename}`;
    }

    // remove image without replacing
    if (removeImage === 'true' && !req.file) {
      if (post.image) {
        const fs = require('fs');
        fs.unlink(path.join(__dirname, '../public', post.image), () => {});
      }
      post.image = '';
    }

    await post.save();
    await post.populate('author', 'username avatar');
    await post.populate('comments.author', 'username avatar');
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Delete post
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.session.userId.toString())
      return res.status(403).json({ error: 'Not authorized' });
    // remove image file if exists
    if (post.image) {
      const fs = require('fs');
      const imgPath = path.join(__dirname, '../public', post.image);
      fs.unlink(imgPath, () => {}); // ignore error if already gone
    }
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Like / Unlike post
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const uid = req.session.userId.toString();
    const liked = post.likes.map(l => l.toString()).includes(uid);
    if (liked) {
      post.likes = post.likes.filter(l => l.toString() !== uid);
    } else {
      post.likes.push(req.session.userId);
    }
    await post.save();
    res.json({ likes: post.likes.length, liked: !liked });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Comment cannot be empty' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.comments.push({ author: req.session.userId, content });
    await post.save();
    await post.populate('comments.author', 'username avatar');
    res.status(201).json(post.comments[post.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete comment
router.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.author.toString() !== req.session.userId.toString())
      return res.status(403).json({ error: 'Not authorized' });
    comment.deleteOne();
    await post.save();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
