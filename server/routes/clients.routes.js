const express = require('express');
const router = express.Router();
const { queryAll, queryGet, queryRun } = require('../db');
const { authenticate, requireRole, logAdminActivity } = require('../auth');

// GET /api/clients (Super Admin sees all, Employee sees active clients for task assignment/dropdowns)
router.get('/', authenticate, (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `SELECT * FROM clients WHERE is_deleted = 0`;
    const params = [];

    // Employees can only see active clients
    if (req.user.role === 'EMPLOYEE') {
      sql += ` AND status = 'ACTIVE'`;
    } else if (status && status !== 'ALL') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (search && search.trim()) {
      sql += ` AND (LOWER(client_name) LIKE ? OR LOWER(company_name) LIKE ? OR LOWER(contact_person) LIKE ?)`;
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY client_name ASC`;
    const clients = queryAll(sql, params);

    // Compute task counts for each client
    const enriched = clients.map(c => {
      const taskCount = queryGet('SELECT COUNT(*) as count FROM tasks WHERE client_id = ? AND is_deleted = 0', [c.id])?.count || 0;
      return {
        ...c,
        tasks_count: taskCount
      };
    });

    return res.json({ clients: enriched });
  } catch (err) {
    console.error('Fetch clients error:', err);
    return res.status(500).json({ error: 'Failed to retrieve clients.' });
  }
});

// GET /api/clients/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const client = queryGet('SELECT * FROM clients WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }
    return res.json({ client });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve client details.' });
  }
});

// POST /api/clients (Super Admin only)
router.post('/', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const {
      client_name,
      company_name = '',
      contact_person = '',
      email = '',
      phone = '',
      status = 'ACTIVE',
      notes = ''
    } = req.body;

    if (!client_name || !client_name.trim()) {
      return res.status(400).json({ error: 'Client Name is required.' });
    }

    const trimmedName = client_name.trim();

    // Check duplicate
    const existing = queryGet('SELECT id FROM clients WHERE LOWER(client_name) = ? AND is_deleted = 0', [trimmedName.toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: `A client named "${trimmedName}" already exists.` });
    }

    const result = queryRun(`
      INSERT INTO clients (client_name, company_name, contact_person, email, phone, status, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      trimmedName,
      company_name.trim(),
      contact_person.trim(),
      email.trim(),
      phone.trim(),
      status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      notes.trim(),
      req.user.id
    ]);

    logAdminActivity(req.user.id, 'CLIENT_CREATED', `Super Admin created client: "${trimmedName}"`, null, result.lastInsertRowid);

    const newClient = queryGet('SELECT * FROM clients WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({
      message: 'Client created successfully!',
      client: newClient
    });
  } catch (err) {
    console.error('Create client error:', err);
    return res.status(500).json({ error: 'Failed to create client.' });
  }
});

// PUT /api/clients/:id (Super Admin only)
router.put('/:id', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const clientId = req.params.id;
    const existing = queryGet('SELECT * FROM clients WHERE id = ? AND is_deleted = 0', [clientId]);
    if (!existing) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const {
      client_name,
      company_name = '',
      contact_person = '',
      email = '',
      phone = '',
      status = 'ACTIVE',
      notes = ''
    } = req.body;

    if (!client_name || !client_name.trim()) {
      return res.status(400).json({ error: 'Client Name is required.' });
    }

    const trimmedName = client_name.trim();

    queryRun(`
      UPDATE clients SET
        client_name = ?,
        company_name = ?,
        contact_person = ?,
        email = ?,
        phone = ?,
        status = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      trimmedName,
      company_name.trim(),
      contact_person.trim(),
      email.trim(),
      phone.trim(),
      status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      notes.trim(),
      clientId
    ]);

    // Also update client_name on existing tasks for this client
    queryRun(`UPDATE tasks SET client_name = ? WHERE client_id = ?`, [trimmedName, clientId]);

    logAdminActivity(req.user.id, 'CLIENT_UPDATED', `Super Admin updated client "${trimmedName}"`, null, clientId);

    const updated = queryGet('SELECT * FROM clients WHERE id = ?', [clientId]);
    return res.json({
      message: 'Client updated successfully!',
      client: updated
    });
  } catch (err) {
    console.error('Update client error:', err);
    return res.status(500).json({ error: 'Failed to update client.' });
  }
});

// PATCH /api/clients/:id/status (Deactivate / Reactivate)
router.patch('/:id/status', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const clientId = req.params.id;
    const client = queryGet('SELECT * FROM clients WHERE id = ? AND is_deleted = 0', [clientId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const newStatus = client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    queryRun('UPDATE clients SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, clientId]);

    logAdminActivity(req.user.id, 'CLIENT_STATUS_CHANGED', `Changed client "${client.client_name}" status to ${newStatus}`, null, clientId);

    return res.json({
      message: `Client status changed to ${newStatus}.`,
      status: newStatus
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to toggle client status.' });
  }
});

// DELETE /api/clients/:id (Soft delete)
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const clientId = req.params.id;
    const client = queryGet('SELECT * FROM clients WHERE id = ? AND is_deleted = 0', [clientId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    queryRun('UPDATE clients SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [clientId]);
    logAdminActivity(req.user.id, 'CLIENT_DELETED', `Super Admin deactivated/deleted client "${client.client_name}"`, null, clientId);

    return res.json({ message: 'Client removed successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete client.' });
  }
});

module.exports = router;
