const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { queryAll, queryGet, queryRun, createNotification } = require('../db');
const { authenticate, requireRole, logAdminActivity } = require('../auth');

// GET /api/users (Super Admin only - Employees receive 403 Forbidden)
router.get('/', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const { status, search, role } = req.query;

    let sql = `
      SELECT id, employee_id, full_name, username, email, phone, mobile_number, department, designation, role, status, avatar_color, profile_photo, joining_date, created_at
      FROM users
      WHERE is_deleted = 0
    `;
    const params = [];

    if (role && role !== 'ALL') {
      sql += ` AND role = ?`;
      params.push(role);
    } else {
      sql += ` AND role = 'EMPLOYEE'`;
    }

    if (status && status !== 'ALL') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (search && search.trim()) {
      sql += ` AND (LOWER(full_name) LIKE ? OR LOWER(username) LIKE ? OR LOWER(email) LIKE ? OR LOWER(employee_id) LIKE ?)`;
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY full_name ASC`;
    const users = queryAll(sql, params);

    // Enrich with task metrics
    const enriched = users.map(u => {
      const taskCount = queryGet('SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND is_deleted = 0', [u.id])?.count || 0;
      const completedCount = queryGet("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'COMPLETED' AND is_deleted = 0", [u.id])?.count || 0;
      return {
        ...u,
        total_tasks: taskCount,
        completed_tasks: completedCount
      };
    });

    return res.json({ users: enriched });
  } catch (err) {
    console.error('Fetch users error:', err);
    return res.status(500).json({ error: 'Failed to retrieve employees.' });
  }
});

// POST /api/users (Add Employee - Super Admin only)
router.post('/', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const {
      full_name,
      employee_id,
      email,
      mobile_number = '',
      phone = '',
      designation = 'IT Specialist',
      department = 'IT Operations',
      joining_date,
      username,
      password,
      profile_photo = '',
      status = 'ACTIVE'
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full Name is required.' });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (!password || password.trim().length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    // Check unique username & email
    const duplicate = queryGet(`
      SELECT id, username, email FROM users 
      WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND is_deleted = 0
    `, [trimmedUsername, trimmedEmail]);

    if (duplicate) {
      if (duplicate.username.toLowerCase() === trimmedUsername) {
        return res.status(400).json({ error: `Username "${trimmedUsername}" is already taken.` });
      }
      return res.status(400).json({ error: `Email "${trimmedEmail}" is already registered.` });
    }

    // Auto generate employee ID if not provided
    let empId = employee_id ? employee_id.trim() : '';
    if (!empId) {
      const latestEmp = queryGet(`SELECT id FROM users ORDER BY id DESC LIMIT 1`);
      const nextNum = (latestEmp?.id || 0) + 1;
      empId = `EMP-${String(nextNum).padStart(3, '0')}`;
    }

    // Palette of professional avatar colors
    const avatarColors = ['#2563EB', '#0D9488', '#D97706', '#7C3AED', '#DB2777', '#059669', '#4F46E5'];
    const chosenColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const hash = bcrypt.hashSync(password.trim(), 10);
    const joinDate = joining_date || new Date().toISOString().split('T')[0];
    const mobileToUse = (mobile_number || phone || '').trim();

    const insertResult = queryRun(`
      INSERT INTO users (
        employee_id, full_name, username, email, mobile_number, phone,
        department, designation, role, password_hash, joining_date,
        status, avatar_color, profile_photo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'EMPLOYEE', ?, ?, ?, ?, ?)
    `, [
      empId,
      full_name.trim(),
      trimmedUsername,
      trimmedEmail,
      mobileToUse,
      mobileToUse,
      department.trim(),
      designation.trim(),
      hash,
      joinDate,
      status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      chosenColor,
      profile_photo.trim()
    ]);

    const newUserId = insertResult.lastInsertRowid;
    logAdminActivity(req.user.id, 'EMPLOYEE_CREATED', `Super Admin added employee ${full_name.trim()} (${empId})`, null, newUserId);

    const newUser = queryGet('SELECT id, employee_id, full_name, username, email, mobile_number, department, designation, role, status, avatar_color, profile_photo, joining_date FROM users WHERE id = ?', [newUserId]);

    return res.status(201).json({
      message: 'Employee created successfully!',
      user: newUser
    });
  } catch (err) {
    console.error('Create employee error:', err);
    return res.status(500).json({ error: 'Failed to create employee: ' + err.message });
  }
});

// GET /api/users/:id (Strict boundary: Employee can ONLY access their own account)
router.get('/:id', authenticate, (req, res) => {
  try {
    const targetId = Number(req.params.id);

    // Security Guard: Employee cannot view another employee profile
    if (req.user.role === 'EMPLOYEE' && req.user.id !== targetId) {
      return res.status(403).json({ error: 'Access denied. You can only view your own profile.' });
    }

    const user = queryGet(`
      SELECT id, employee_id, full_name, username, email, phone, mobile_number, department, designation, role, status, avatar_color, profile_photo, joining_date
      FROM users WHERE id = ? AND is_deleted = 0
    `, [targetId]);

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Fetch stats for this employee
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTasks = queryAll('SELECT * FROM tasks WHERE assigned_to = ? AND task_date = ? AND is_deleted = 0', [targetId, todayStr]);
    const allTasks = queryAll('SELECT * FROM tasks WHERE assigned_to = ? AND is_deleted = 0', [targetId]);

    const completedToday = todayTasks.filter(t => t.status === 'COMPLETED').length;
    const inProgressToday = todayTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED').length;
    const pendingToday = todayTasks.filter(t => t.status === 'PENDING').length;

    return res.json({
      user,
      stats: {
        totalToday: todayTasks.length,
        completedToday,
        inProgressToday,
        pendingToday,
        totalAllTime: allTasks.length,
        completedAllTime: allTasks.filter(t => t.status === 'COMPLETED').length
      },
      todayTasks
    });
  } catch (err) {
    console.error('Get user profile error:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// PUT /api/users/:id (Super Admin edits employee)
router.put('/:id', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const existing = queryGet('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [targetId]);
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const {
      full_name,
      employee_id,
      email,
      mobile_number,
      designation,
      department,
      status,
      joining_date,
      profile_photo
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full Name is required.' });
    }

    const mobileToUse = (mobile_number || existing.mobile_number || '').trim();

    queryRun(`
      UPDATE users SET
        full_name = ?,
        employee_id = COALESCE(?, employee_id),
        email = COALESCE(?, email),
        mobile_number = ?,
        phone = ?,
        designation = COALESCE(?, designation),
        department = COALESCE(?, department),
        status = COALESCE(?, status),
        joining_date = COALESCE(?, joining_date),
        profile_photo = COALESCE(?, profile_photo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      full_name.trim(),
      employee_id?.trim() || null,
      email?.trim().toLowerCase() || null,
      mobileToUse,
      mobileToUse,
      designation?.trim() || null,
      department?.trim() || null,
      status || null,
      joining_date || null,
      profile_photo?.trim() || null,
      targetId
    ]);

    logAdminActivity(req.user.id, 'EMPLOYEE_UPDATED', `Super Admin updated details for ${full_name.trim()}`, null, targetId);

    const updated = queryGet('SELECT id, employee_id, full_name, username, email, mobile_number, department, designation, role, status, avatar_color, profile_photo, joining_date FROM users WHERE id = ?', [targetId]);
    return res.json({
      message: 'Employee updated successfully!',
      user: updated
    });
  } catch (err) {
    console.error('Update employee error:', err);
    return res.status(500).json({ error: 'Failed to update employee.' });
  }
});

// PATCH /api/users/:id/status (Deactivate / Reactivate Employee)
router.patch('/:id/status', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own Super Admin account.' });
    }

    const user = queryGet('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [targetId]);
    if (!user) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    queryRun('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, targetId]);
    logAdminActivity(req.user.id, 'EMPLOYEE_STATUS_CHANGED', `Changed employee ${user.full_name} status to ${newStatus}`, null, targetId);

    return res.json({
      message: `Employee status changed to ${newStatus}.`,
      status: newStatus
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update status.' });
  }
});

// POST /api/users/:id/reset-password (Super Admin resets employee password)
router.post('/:id/reset-password', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const targetId = Number(req.params.id);
    let { new_password, temporary_password, generate_random } = req.body;

    const user = queryGet('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [targetId]);
    if (!user) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    let tempPassword = (temporary_password || new_password)?.trim();
    if (generate_random || !tempPassword) {
      // Generate secure random temporary password e.g. Temp@9482Xp
      const randHex = Math.random().toString(36).slice(-5).toUpperCase() + Math.floor(100 + Math.random() * 900);
      tempPassword = `Temp@${randHex}`;
    }

    if (tempPassword.length < 6) {
      return res.status(400).json({ error: 'Temporary password must be at least 6 characters long.' });
    }

    const newHash = bcrypt.hashSync(tempPassword, 10);
    queryRun(`
      UPDATE users SET
        password_hash = ?,
        must_change_password = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newHash, targetId]);

    // Cancel any old PENDING password change requests for this user
    queryRun(`
      UPDATE password_change_requests
      SET status = 'REJECTED', rejection_reason = 'Super Admin directly reset account password', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND status = 'PENDING'
    `, [req.user.id, targetId]);

    // Log admin activity (DO NOT log plain password)
    logAdminActivity(
      req.user.id,
      'PASSWORD_RESET',
      `Super Admin reset temporary password for ${user.full_name} (${user.employee_id}) with forced change on next login`,
      null,
      targetId
    );

    // Notify employee
    createNotification(
      targetId,
      'Password Reset by Super Admin',
      'Your account password has been reset by the Super Admin. Please log in using the temporary password provided to you and set your permanent password.',
      'PASSWORD_RESET'
    );

    return res.json({
      message: `Password for ${user.full_name} reset successfully.`,
      temporary_password: tempPassword,
      employee_name: user.full_name,
      employee_id: user.employee_id,
      must_change_password: true
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

module.exports = router;
