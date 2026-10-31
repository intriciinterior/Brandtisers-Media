const express = require('express');
const router = express.Router();
const { queryAll } = require('../db');
const { authenticate, requireRole } = require('../auth');

// GET /api/activity (Super Admin Activity Audit Log)
router.get('/', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;

    const activities = queryAll(`
      SELECT 
        s.id,
        s.action_type as action,
        s.description as details,
        s.created_at,
        u.id as user_id,
        u.full_name as user_name,
        u.employee_id as user_employee_id,
        u.role as user_role,
        u.avatar_color as user_avatar_color
      FROM system_activity_logs s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.id DESC
      LIMIT ?
    `, [limit]);

    return res.json({ activities });
  } catch (err) {
    console.error('Fetch activity error:', err);
    return res.status(500).json({ error: 'Failed to retrieve activity log.' });
  }
});

module.exports = router;
