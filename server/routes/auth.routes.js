const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { queryGet, queryAll, queryRun, createNotification } = require('../db');
const { generateToken, authenticate, requireRole, logAdminActivity } = require('../auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const login = req.body.login || req.body.login_id || req.body.username;
    const { password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Please enter both username/email and password.' });
    }

    const trimmedLogin = login.trim().toLowerCase();

    const user = queryGet(`
      SELECT * FROM users 
      WHERE (LOWER(username) = ? OR LOWER(email) = ? OR LOWER(employee_id) = ?) 
      AND is_deleted = 0
    `, [trimmedLogin, trimmedLogin, trimmedLogin]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact Super Admin.' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const company = queryGet('SELECT * FROM company_settings WHERE id = 1') || {
      company_name: '',
      logo_url: '',
      tagline: '',
      setup_completed: 0
    };

    const token = generateToken(user);

    logAdminActivity(user.id, 'LOGIN', `User ${user.full_name} (${user.role}) logged in`);

    const safeUser = {
      id: user.id,
      employee_id: user.employee_id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      phone: user.phone || user.mobile_number,
      mobile_number: user.mobile_number || user.phone,
      department: user.department,
      designation: user.designation,
      role: user.role,
      status: user.status,
      avatar_color: user.avatar_color,
      profile_photo: user.profile_photo,
      joining_date: user.joining_date,
      must_change_password: Boolean(user.must_change_password)
    };

    return res.json({
      message: 'Login successful',
      token,
      user: safeUser,
      setup_completed: Boolean(company.setup_completed),
      company: {
        company_name: company.company_name,
        logo_url: company.logo_url,
        tagline: company.tagline,
        email: company.email,
        phone: company.phone,
        address: company.address,
        website: company.website,
        time_zone: company.time_zone,
        setup_completed: Boolean(company.setup_completed)
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const company = queryGet('SELECT * FROM company_settings WHERE id = 1') || {
      company_name: '',
      logo_url: '',
      tagline: '',
      setup_completed: 0
    };

    return res.json({
      user: req.user,
      setup_completed: Boolean(company.setup_completed),
      company: {
        company_name: company.company_name,
        logo_url: company.logo_url,
        tagline: company.tagline,
        email: company.email,
        phone: company.phone,
        address: company.address,
        website: company.website,
        time_zone: company.time_zone,
        setup_completed: Boolean(company.setup_completed)
      }
    });
  } catch (err) {
    console.error('Auth check error:', err);
    return res.status(500).json({ error: 'Failed to verify session.' });
  }
});

// POST /api/auth/initial-setup (Super Admin Initial Setup Wizard)
router.post('/initial-setup', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const {
      company_name,
      logo_url = '',
      tagline = '',
      company_email = '',
      company_phone = '',
      company_address = '',
      website = '',
      time_zone = 'Asia/Kolkata',
      admin_name,
      admin_email,
      admin_mobile = '',
      admin_username,
      new_password,
      profile_photo = '',
      initial_work_types = []
    } = req.body;

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: 'Company Name is mandatory to configure the system.' });
    }

    // 1. Update company settings
    queryRun(`
      UPDATE company_settings SET
        company_name = ?,
        logo_url = ?,
        tagline = ?,
        email = ?,
        phone = ?,
        address = ?,
        website = ?,
        time_zone = ?,
        setup_completed = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      company_name.trim(),
      logo_url.trim(),
      tagline.trim(),
      company_email.trim(),
      company_phone.trim(),
      company_address.trim(),
      website.trim(),
      time_zone.trim()
    ]);

    // 2. Update Super Admin profile
    let sqlAdmin = `
      UPDATE users SET
        full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        mobile_number = COALESCE(?, mobile_number),
        username = COALESCE(?, username),
        profile_photo = COALESCE(?, profile_photo),
        updated_at = CURRENT_TIMESTAMP
    `;
    const paramsAdmin = [
      admin_name?.trim() || req.user.full_name,
      admin_email?.trim().toLowerCase() || req.user.email,
      admin_mobile?.trim() || req.user.mobile_number,
      admin_username?.trim().toLowerCase() || req.user.username,
      profile_photo?.trim() || req.user.profile_photo
    ];

    if (new_password && new_password.trim().length >= 6) {
      sqlAdmin += `, password_hash = ?`;
      paramsAdmin.push(bcrypt.hashSync(new_password.trim(), 10));
    }

    sqlAdmin += ` WHERE id = ?`;
    paramsAdmin.push(req.user.id);
    queryRun(sqlAdmin, paramsAdmin);

    // 3. Add initial work types if selected
    if (Array.isArray(initial_work_types) && initial_work_types.length > 0) {
      initial_work_types.forEach((wtName, idx) => {
        if (wtName && wtName.trim()) {
          const trimmed = wtName.trim();
          const existing = queryGet('SELECT id FROM work_types WHERE LOWER(name) = ?', [trimmed.toLowerCase()]);
          if (!existing) {
            queryRun(`
              INSERT INTO work_types (name, description, status, sort_order)
              VALUES (?, 'Work category configured during setup', 'ACTIVE', ?)
            `, [trimmed, idx + 1]);
          }
        }
      });
    }

    logAdminActivity(req.user.id, 'INITIAL_SETUP', `Super Admin configured company: ${company_name.trim()}`);

    const updatedUser = queryGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const updatedCompany = queryGet('SELECT * FROM company_settings WHERE id = 1');
    const newToken = generateToken(updatedUser);

    return res.json({
      message: 'System successfully configured!',
      token: newToken,
      user: {
        id: updatedUser.id,
        employee_id: updatedUser.employee_id,
        full_name: updatedUser.full_name,
        username: updatedUser.username,
        email: updatedUser.email,
        mobile_number: updatedUser.mobile_number,
        role: updatedUser.role,
        department: updatedUser.department,
        designation: updatedUser.designation,
        avatar_color: updatedUser.avatar_color,
        profile_photo: updatedUser.profile_photo
      },
      company: updatedCompany
    });
  } catch (err) {
    console.error('Setup wizard error:', err);
    return res.status(500).json({ error: 'Failed to complete initial configuration: ' + err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Both current password and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = queryGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const match = bcrypt.compareSync(current_password, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    // 1. Super Admin changes their own password directly (Requirement 1)
    if (user.role === 'SUPER_ADMIN') {
      const newHash = bcrypt.hashSync(new_password, 10);
      queryRun('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, req.user.id]);
      logAdminActivity(req.user.id, 'PASSWORD_CHANGED', `Super Admin ${user.full_name} updated own account password`);
      return res.json({
        message: 'Your password has been updated successfully.',
        request_status: 'ACTIVE'
      });
    }

    // 2. Forced Temporary Password Change on Login (Requirement 9)
    if (user.must_change_password) {
      const newHash = bcrypt.hashSync(new_password, 10);
      queryRun('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, req.user.id]);
      logAdminActivity(req.user.id, 'PASSWORD_INITIALIZED', `Employee ${user.full_name} (${user.employee_id}) replaced temporary password`);
      return res.json({
        message: 'Temporary password replaced successfully! Your permanent password is now active.',
        request_status: 'ACTIVE',
        must_change_password: false
      });
    }

    // 3. Normal Employee Password Change Request -> Requires Super Admin Approval (Requirements 3 & 4)
    const existingPending = queryGet('SELECT id FROM password_change_requests WHERE user_id = ? AND status = "PENDING"', [req.user.id]);
    if (existingPending) {
      return res.status(400).json({
        error: 'You already have a password change request pending approval. Please wait for Super Admin review.',
        request_status: 'PENDING'
      });
    }

    // Securely hash requested password (NEVER plain text)
    const requestedHash = bcrypt.hashSync(new_password, 10);
    const insertRes = queryRun(`
      INSERT INTO password_change_requests (user_id, requested_password_hash, status)
      VALUES (?, ?, 'PENDING')
    `, [req.user.id, requestedHash]);

    const requestId = insertRes.lastInsertRowid;

    // Log Activity (DO NOT log plain password)
    logAdminActivity(
      req.user.id,
      'PASSWORD_REQUEST_CREATED',
      `Employee ${user.full_name} (${user.employee_id}) submitted a password change request`
    );

    // Notify Super Admins
    const superAdmins = queryAll("SELECT id FROM users WHERE role = 'SUPER_ADMIN' AND is_deleted = 0");
    const reqTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const reqDate = new Date().toLocaleDateString();
    for (const sa of superAdmins) {
      createNotification(
        sa.id,
        'Password Change Request',
        `${user.full_name} (${user.employee_id}) requested a password change on ${reqDate} at ${reqTime}. Status: Pending Approval.`,
        'PASSWORD_CHANGE_REQUEST',
        requestId
      );
    }

    return res.json({
      message: 'Your password change request has been sent for approval.',
      status: 'PENDING',
      request_status: 'PENDING',
      request_id: requestId
    });
  } catch (err) {
    console.error('Password change error:', err);
    return res.status(500).json({ error: 'Failed to process password request: ' + err.message });
  }
});

// GET /api/auth/password-request-status (Check employee's latest password change request)
router.get('/password-request-status', authenticate, (req, res) => {
  try {
    const latest = queryGet(`
      SELECT id, status, rejection_reason, created_at, reviewed_at
      FROM password_change_requests
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 1
    `, [req.user.id]);
    return res.json({
      request: latest || null,
      has_pending: Boolean(latest && latest.status === 'PENDING')
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch password request status.' });
  }
});

// POST /api/auth/impersonate (Super Admin viewing Employee account)
router.post('/impersonate', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    if (req.user.is_impersonated) {
      return res.status(400).json({
        error: 'Nested impersonation is not permitted. Please return to your original account first.'
      });
    }

    const { target_user_id } = req.body;
    if (!target_user_id) {
      return res.status(400).json({ error: 'Target employee ID is required.' });
    }

    const targetId = Number(target_user_id);
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot impersonate yourself.' });
    }

    const targetUser = queryGet('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [targetId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'Employee not found or deactivated.' });
    }

    logAdminActivity(req.user.id, 'IMPERSONATION_STARTED', `Super Admin viewing ${targetUser.full_name}'s workspace`, null, targetUser.id);
    const impersonationToken = generateToken(targetUser, req.user);

    return res.json({
      message: `Now viewing ${targetUser.full_name}'s account`,
      token: impersonationToken,
      user: {
        id: targetUser.id,
        employee_id: targetUser.employee_id,
        full_name: targetUser.full_name,
        username: targetUser.username,
        email: targetUser.email,
        mobile_number: targetUser.mobile_number,
        department: targetUser.department,
        designation: targetUser.designation,
        role: targetUser.role,
        status: targetUser.status,
        avatar_color: targetUser.avatar_color,
        profile_photo: targetUser.profile_photo,
        is_impersonated: true,
        original_user: {
          id: req.user.id,
          employee_id: req.user.employee_id,
          full_name: req.user.full_name,
          username: req.user.username,
          role: req.user.role
        }
      }
    });
  } catch (err) {
    console.error('Impersonation error:', err);
    return res.status(500).json({ error: 'Failed to initiate impersonation.' });
  }
});

// POST /api/auth/exit-impersonate
router.post('/exit-impersonate', authenticate, (req, res) => {
  try {
    if (!req.user.is_impersonated || !req.user.original_user) {
      return res.status(400).json({ error: 'You are not currently in an impersonation session.' });
    }

    const originalUserId = req.user.original_user.id;
    const originalUser = queryGet('SELECT * FROM users WHERE id = ? AND is_deleted = 0', [originalUserId]);
    if (!originalUser) {
      return res.status(404).json({ error: 'Original administrator account not found.' });
    }

    logAdminActivity(originalUser.id, 'IMPERSONATION_ENDED', `Restored Super Admin account session`, null, req.user.id);
    const restoredToken = generateToken(originalUser);

    return res.json({
      message: 'Returned to your Super Admin account.',
      token: restoredToken,
      user: {
        id: originalUser.id,
        employee_id: originalUser.employee_id,
        full_name: originalUser.full_name,
        username: originalUser.username,
        email: originalUser.email,
        mobile_number: originalUser.mobile_number,
        department: originalUser.department,
        designation: originalUser.designation,
        role: originalUser.role,
        status: originalUser.status,
        avatar_color: originalUser.avatar_color,
        profile_photo: originalUser.profile_photo,
        is_impersonated: false,
        original_user: null
      }
    });
  } catch (err) {
    console.error('Exit impersonate error:', err);
    return res.status(500).json({ error: 'Failed to exit impersonation.' });
  }
});

module.exports = router;
