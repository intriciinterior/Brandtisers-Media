const express = require('express');
const router = express.Router();
const { queryGet, queryAll, queryRun } = require('../db');
const { authenticate } = require('../auth');

// GET /api/notifications - List user's notifications
router.get('/', authenticate, (req, res) => {
  try {
    const notifications = queryAll(`
      SELECT n.*, t.task_id, t.title as task_title
      FROM notifications n
      LEFT JOIN tasks t ON n.related_task_id = t.id
      WHERE n.user_id = ?
      ORDER BY n.is_read ASC, n.id DESC
      LIMIT 50
    `, [req.user.id]);

    const unreadCount = queryGet(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND is_read = 0
    `, [req.user.id]);

    return res.json({
      notifications,
      unreadCount: unreadCount ? unreadCount.count : 0
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// PATCH /api/notifications/:id/read - Mark single as read
router.patch('/:id/read', authenticate, (req, res) => {
  try {
    const notifId = req.params.id;
    queryRun(`
      UPDATE notifications SET is_read = 1
      WHERE id = ? AND user_id = ?
    `, [notifId, req.user.id]);

    return res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', authenticate, (req, res) => {
  try {
    queryRun(`
      UPDATE notifications SET is_read = 1
      WHERE user_id = ?
    `, [req.user.id]);

    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

module.exports = router;
