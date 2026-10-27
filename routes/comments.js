const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Edit own comment
router.put('/:id', requireAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Comment not found' });
  if (c.user_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own comments' });
  const content = ((req.body || {}).content || '').trim();
  if (!content) return res.status(400).json({ error: 'Comment cannot be empty' });
  db.prepare('UPDATE comments SET content = ? WHERE id = ?').run(content, c.id);
  res.json({ ...c, content });
});

// Delete: comment owner OR the post's author
router.delete('/:id', requireAuth, (req, res) => {
  const c = db.prepare(`
    SELECT c.*, p.author_id AS post_author FROM comments c
    JOIN posts p ON p.id = c.post_id WHERE c.id = ?`).get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Comment not found' });
  if (c.user_id !== req.user.id && c.post_author !== req.user.id)
    return res.status(403).json({ error: 'Not allowed to delete this comment' });
  db.prepare('DELETE FROM comments WHERE id = ?').run(c.id);
  res.json({ message: 'Comment deleted' });
});

module.exports = router;
