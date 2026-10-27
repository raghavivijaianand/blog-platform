const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const BASE = `
  SELECT p.id, p.title, p.content, p.author_id, p.created_at, p.updated_at,
         u.username AS author,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
  FROM posts p JOIN users u ON u.id = p.author_id`;

const COMMENT_BASE = `
  SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.username AS author
  FROM comments c JOIN users u ON u.id = c.user_id`;

// List posts (optional ?q=search)
router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  const rows = q
    ? db.prepare(`${BASE} WHERE p.title LIKE ? OR p.content LIKE ? ORDER BY p.created_at DESC, p.id DESC`)
        .all(`%${q}%`, `%${q}%`)
    : db.prepare(`${BASE} ORDER BY p.created_at DESC, p.id DESC`).all();
  res.json(rows);
});

// Single post
router.get('/:id', (req, res) => {
  const row = db.prepare(`${BASE} WHERE p.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Post not found' });
  res.json(row);
});

// Create
router.post('/', requireAuth, (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'title and content are required' });
  const info = db.prepare('INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)')
    .run(title.trim(), content.trim(), req.user.id);
  res.status(201).json(db.prepare(`${BASE} WHERE p.id = ?`).get(info.lastInsertRowid));
});

// Edit (author only)
router.put('/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.author_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own posts' });
  const { title, content } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'title and content are required' });
  db.prepare('UPDATE posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(title.trim(), content.trim(), post.id);
  res.json(db.prepare(`${BASE} WHERE p.id = ?`).get(post.id));
});

// Delete (author only)
router.delete('/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.author_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own posts' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  res.json({ message: 'Post deleted' });
});

// ---- Comments nested under a post ----
router.get('/:id/comments', (req, res) => {
  res.json(db.prepare(`${COMMENT_BASE} WHERE c.post_id = ? ORDER BY c.created_at ASC, c.id ASC`).all(req.params.id));
});

router.post('/:id/comments', requireAuth, (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const content = ((req.body || {}).content || '').trim();
  if (!content) return res.status(400).json({ error: 'Comment cannot be empty' });
  const info = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)')
    .run(post.id, req.user.id, content);
  res.status(201).json(db.prepare(`${COMMENT_BASE} WHERE c.id = ?`).get(info.lastInsertRowid));
});

module.exports = router;
