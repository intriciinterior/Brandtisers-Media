const express = require('express');
const router = express.Router();
const { queryAll, queryGet, queryRun } = require('../db');
const { authenticate, requireRole, logAdminActivity } = require('../auth');

// GET /api/work-types
router.get('/', authenticate, (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `SELECT * FROM work_types WHERE is_deleted = 0`;
    const params = [];

    // Employees only see active work types
    if (req.user.role === 'EMPLOYEE') {
      sql += ` AND status = 'ACTIVE'`;
    } else if (status && status !== 'ALL') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (search && search.trim()) {
      sql += ` AND LOWER(name) LIKE ?`;
      params.push(`%${search.trim().toLowerCase()}%`);
    }

    sql += ` ORDER BY sort_order ASC, name ASC`;
    const workTypes = queryAll(sql, params);

    return res.json({ work_types: workTypes, workTypes });
  } catch (err) {
    console.error('Fetch work types error:', err);
    return res.status(500).json({ error: 'Failed to retrieve work types.' });
  }
});

// POST /api/work-types (Super Admin only)
router.post('/', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const { name, description = '', sort_order = 0, status = 'ACTIVE' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Work Type Name is required.' });
    }

    const trimmedName = name.trim();

    // Check duplicate
    const existing = queryGet('SELECT id FROM work_types WHERE LOWER(name) = ? AND is_deleted = 0', [trimmedName.toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: `Work Type "${trimmedName}" already exists.` });
    }

    const result = queryRun(`
      INSERT INTO work_types (name, description, status, sort_order)
      VALUES (?, ?, ?, ?)
    `, [
      trimmedName,
      description.trim(),
      status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      Number(sort_order) || 0
    ]);

    logAdminActivity(req.user.id, 'WORK_TYPE_CREATED', `Super Admin added work category: "${trimmedName}"`, null, result.lastInsertRowid);

    const newType = queryGet('SELECT * FROM work_types WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({
      message: 'Work Type created successfully!',
      work_type: newType
    });
  } catch (err) {
    console.error('Create work type error:', err);
    return res.status(500).json({ error: 'Failed to create work type.' });
  }
});

// PUT /api/work-types/:id (Super Admin only)
router.put('/:id', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const typeId = req.params.id;
    const existing = queryGet('SELECT * FROM work_types WHERE id = ? AND is_deleted = 0', [typeId]);
    if (!existing) {
      return res.status(404).json({ error: 'Work Type not found.' });
    }

    const { name, description = '', sort_order = 0, status = 'ACTIVE' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Work Type Name is required.' });
    }

    const trimmedName = name.trim();

    queryRun(`
      UPDATE work_types SET
        name = ?,
        description = ?,
        status = ?,
        sort_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      trimmedName,
      description.trim(),
      status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      Number(sort_order) || 0,
      typeId
    ]);

    logAdminActivity(req.user.id, 'WORK_TYPE_UPDATED', `Super Admin updated work category "${trimmedName}"`, null, typeId);

    const updated = queryGet('SELECT * FROM work_types WHERE id = ?', [typeId]);
    return res.json({
      message: 'Work Type updated successfully!',
      work_type: updated
    });
  } catch (err) {
    console.error('Update work type error:', err);
    return res.status(500).json({ error: 'Failed to update work type.' });
  }
});

// PATCH /api/work-types/:id/status (Toggle Active/Inactive)
router.patch('/:id/status', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const typeId = req.params.id;
    const type = queryGet('SELECT * FROM work_types WHERE id = ? AND is_deleted = 0', [typeId]);
    if (!type) {
      return res.status(404).json({ error: 'Work Type not found.' });
    }

    const newStatus = type.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    queryRun('UPDATE work_types SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, typeId]);
    logAdminActivity(req.user.id, 'WORK_TYPE_STATUS_CHANGED', `Changed "${type.name}" status to ${newStatus}`, null, typeId);

    return res.json({
      message: `Work Type status changed to ${newStatus}.`,
      status: newStatus
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to toggle work type status.' });
  }
});

// DELETE /api/work-types/:id (Soft delete)
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const typeId = req.params.id;
    const type = queryGet('SELECT * FROM work_types WHERE id = ? AND is_deleted = 0', [typeId]);
    if (!type) {
      return res.status(404).json({ error: 'Work Type not found.' });
    }

    queryRun('UPDATE work_types SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [typeId]);
    logAdminActivity(req.user.id, 'WORK_TYPE_DELETED', `Super Admin deleted work type "${type.name}"`, null, typeId);

    return res.json({ message: 'Work Type deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete work type.' });
  }
});

module.exports = router;
