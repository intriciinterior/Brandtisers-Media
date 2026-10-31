const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { queryGet, queryRun, queryAll, createNotification } = require('../db');
const { authenticate, requireRole, logAdminActivity, generateToken } = require('../auth');

// GET /api/settings/company (Publicly accessible so login page, headers, and reports can load branding)
router.get('/company', (req, res) => {
  try {
    const company = queryGet('SELECT * FROM company_settings WHERE id = 1');
    if (!company) {
      return res.json({
        company_name: '',
        logo_url: '',
        tagline: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        time_zone: 'Asia/Kolkata',
        setup_completed: false
      });
    }

    return res.json({
      company_name: company.company_name || '',
      logo_url: company.logo_url || '',
      tagline: company.tagline || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      website: company.website || '',
      time_zone: company.time_zone || 'Asia/Kolkata',
      setup_completed: Boolean(company.setup_completed)
    });
  } catch (err) {
    console.error('Fetch company settings error:', err);
    return res.status(500).json({ error: 'Failed to retrieve company settings.' });
  }
});

// PUT /api/settings/company (Super Admin only)
router.put('/company', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const {
      company_name,
      logo_url = '',
      tagline = '',
      email = '',
      phone = '',
      address = '',
      website = '',
      time_zone = 'Asia/Kolkata'
    } = req.body;

    const finalCompanyName = company_name ? company_name.trim() : '';

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
      finalCompanyName,
      (logo_url || '').trim(),
      (tagline || '').trim(),
      (email || '').trim(),
      (phone || '').trim(),
      (address || '').trim(),
      (website || '').trim(),
      (time_zone || 'Asia/Kolkata').trim()
    ]);

    logAdminActivity(req.user.id, 'SETTINGS_UPDATED', `Super Admin updated company settings${finalCompanyName ? ` for ${finalCompanyName}` : ''}`);

    const updated = queryGet('SELECT * FROM company_settings WHERE id = 1');
    return res.json({
      message: 'Company settings updated successfully!',
      company: {
        company_name: updated.company_name,
        logo_url: updated.logo_url,
        tagline: updated.tagline,
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
        website: updated.website,
        time_zone: updated.time_zone,
        setup_completed: Boolean(updated.setup_completed)
      }
    });
  } catch (err) {
    console.error('Update company settings error:', err);
    return res.status(500).json({ error: 'Failed to update company settings.' });
  }
});

// GET /api/settings/profile (Super Admin profile)
router.get('/profile', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const user = queryGet('SELECT id, employee_id, full_name, username, email, mobile_number, phone, department, designation, role, profile_photo FROM users WHERE id = ?', [req.user.id]);
    return res.json({ profile: user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// PUT /api/settings/profile (Super Admin updates own profile)
router.put('/profile', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const { full_name, email, mobile_number, username, profile_photo, new_password } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full Name is required.' });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    // Check username/email uniqueness
    const existing = queryGet(`
      SELECT id FROM users 
      WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND id != ?
    `, [username.trim().toLowerCase(), email?.trim().toLowerCase() || '', req.user.id]);

    if (existing) {
      return res.status(400).json({ error: 'Username or email is already taken by another account.' });
    }

    let sql = `
      UPDATE users SET
        full_name = ?,
        username = ?,
        email = COALESCE(?, email),
        mobile_number = ?,
        phone = ?,
        profile_photo = ?,
        updated_at = CURRENT_TIMESTAMP
    `;
    const params = [
      full_name.trim(),
      username.trim(),
      email?.trim().toLowerCase(),
      mobile_number?.trim() || '',
      mobile_number?.trim() || '',
      profile_photo?.trim() || ''
    ];

    if (new_password && new_password.trim().length >= 6) {
      sql += `, password_hash = ?`;
      params.push(bcrypt.hashSync(new_password.trim(), 10));
    }

    sql += ` WHERE id = ?`;
    params.push(req.user.id);

    queryRun(sql, params);
    logAdminActivity(req.user.id, 'PROFILE_UPDATED', `Super Admin updated own profile details`);

    const updatedUser = queryGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const newToken = generateToken(updatedUser);

    return res.json({
      message: 'Profile updated successfully!',
      token: newToken,
      user: {
        id: updatedUser.id,
        employee_id: updatedUser.employee_id,
        full_name: updatedUser.full_name,
        username: updatedUser.username,
        email: updatedUser.email,
        mobile_number: updatedUser.mobile_number,
        department: updatedUser.department,
        designation: updatedUser.designation,
        role: updatedUser.role,
        avatar_color: updatedUser.avatar_color,
        profile_photo: updatedUser.profile_photo
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// GET /api/settings/email (View SMTP config - password masked)
router.get('/email', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const company = queryGet('SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from_name, smtp_from_email FROM company_settings WHERE id = 1');
    return res.json({
      smtp_host: company?.smtp_host || '',
      smtp_port: company?.smtp_port || 587,
      smtp_secure: Boolean(company?.smtp_secure),
      smtp_user: company?.smtp_user || '',
      has_password: Boolean(company?.smtp_pass),
      smtp_from_name: company?.smtp_from_name || '',
      smtp_from_email: company?.smtp_from_email || '',
      is_configured: Boolean(company?.smtp_host && company?.smtp_user)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch email configuration.' });
  }
});

// PUT /api/settings/email (Update SMTP config)
router.put('/email', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const {
      smtp_host = '',
      smtp_port = 587,
      smtp_secure = false,
      smtp_user = '',
      smtp_pass,
      smtp_from_name = '',
      smtp_from_email = ''
    } = req.body;

    let sql = `
      UPDATE company_settings SET
        smtp_host = ?,
        smtp_port = ?,
        smtp_secure = ?,
        smtp_user = ?,
        smtp_from_name = ?,
        smtp_from_email = ?,
        updated_at = CURRENT_TIMESTAMP
    `;
    const params = [
      smtp_host.trim(),
      Number(smtp_port) || 587,
      smtp_secure ? 1 : 0,
      smtp_user.trim(),
      smtp_from_name.trim(),
      smtp_from_email.trim()
    ];

    if (smtp_pass !== undefined && smtp_pass !== null && smtp_pass !== '') {
      sql += `, smtp_pass = ?`;
      params.push(smtp_pass);
    }

    sql += ` WHERE id = 1`;
    queryRun(sql, params);

    logAdminActivity(req.user.id, 'SETTINGS_UPDATED', `Super Admin updated SMTP Email configuration`);

    return res.json({ message: 'Email settings saved successfully!' });
  } catch (err) {
    console.error('Update email settings error:', err);
    return res.status(500).json({ error: 'Failed to update email settings.' });
  }
});

// POST /api/settings/test-email (Test sending an email)
router.post('/test-email', authenticate, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { recipient_email } = req.body;
    if (!recipient_email || !recipient_email.trim()) {
      return res.status(400).json({ error: 'Recipient email is required for the test.' });
    }

    const company = queryGet('SELECT * FROM company_settings WHERE id = 1');
    if (!company || !company.smtp_host || !company.smtp_user) {
      return res.status(400).json({
        error: 'Email service is not yet configured. Please fill in SMTP Host and SMTP User.'
      });
    }

    const transporter = nodemailer.createTransport({
      host: company.smtp_host,
      port: Number(company.smtp_port) || 587,
      secure: Boolean(company.smtp_secure),
      auth: {
        user: company.smtp_user,
        pass: company.smtp_pass || ''
      }
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"${company.smtp_from_name || company.company_name || 'IT Task Tracker'}" <${company.smtp_from_email || company.smtp_user}>`,
      to: recipient_email.trim(),
      subject: `Test Verification Email - ${company.company_name || 'IT Operations'}`,
      text: `Hello,\n\nThis is a verification test email confirming that your IT Team Task & Report Management email service is properly configured and operational.\n\nBest regards,\n${company.company_name || 'IT Management'}`
    });

    logAdminActivity(req.user.id, 'TEST_EMAIL_SENT', `Sent SMTP test email to ${recipient_email.trim()}`);

    return res.json({ message: `Test email sent successfully to ${recipient_email.trim()}!` });
  } catch (err) {
    console.error('Test email error:', err);
    return res.status(400).json({
      error: 'SMTP test failed: ' + (err.message || 'Check your SMTP credentials and port settings.')
    });
  }
});

// =========================================================================
// 5. Password Requests & Security Approval Panel (Requirements 4, 6, 7)
// =========================================================================

// GET /api/settings/password-requests (Super Admin views all requests)
router.get('/password-requests', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const requests = queryAll(`
      SELECT 
        pcr.id,
        pcr.user_id,
        pcr.status,
        pcr.rejection_reason,
        pcr.created_at,
        pcr.reviewed_at,
        u.full_name,
        u.full_name as employee_name,
        u.employee_id,
        u.email,
        u.email as employee_email,
        u.designation,
        u.department,
        u.avatar_color,
        reviewer.full_name as reviewer_name
      FROM password_change_requests pcr
      JOIN users u ON pcr.user_id = u.id
      LEFT JOIN users reviewer ON pcr.reviewed_by = reviewer.id
      ORDER BY pcr.id DESC
    `);

    return res.json({ requests });
  } catch (err) {
    console.error('Fetch password requests error:', err);
    return res.status(500).json({ error: 'Failed to fetch password requests: ' + err.message });
  }
});

// POST /api/settings/password-requests/:id/approve (Super Admin approves password change)
router.post('/password-requests/:id/approve', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const pcr = queryGet('SELECT * FROM password_change_requests WHERE id = ?', [requestId]);
    if (!pcr) {
      return res.status(404).json({ error: 'Password request not found.' });
    }
    if (pcr.status !== 'PENDING') {
      return res.status(400).json({ error: `Request has already been ${pcr.status.toLowerCase()}.` });
    }

    const employee = queryGet('SELECT id, full_name, employee_id FROM users WHERE id = ?', [pcr.user_id]);
    if (!employee) {
      return res.status(404).json({ error: 'Associated employee not found.' });
    }

    // Activate the requested password hash (NEVER plaintext)
    queryRun(`
      UPDATE users SET
        password_hash = ?,
        must_change_password = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [pcr.requested_password_hash, pcr.user_id]);

    // Update request status
    queryRun(`
      UPDATE password_change_requests SET
        status = 'APPROVED',
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.user.id, requestId]);

    // Audit log (DO NOT log plain password)
    logAdminActivity(
      req.user.id,
      'PASSWORD_REQUEST_APPROVED',
      `Super Admin approved password change request for ${employee.full_name} (${employee.employee_id})`,
      requestId,
      employee.id
    );

    // Notify employee
    createNotification(
      employee.id,
      'Password Request Approved',
      'Your password change request has been approved. You can now use your new password to log in.',
      'PASSWORD_REQUEST_APPROVED'
    );

    return res.json({
      message: `Password change request for ${employee.full_name} has been approved.`,
      status: 'APPROVED'
    });
  } catch (err) {
    console.error('Approve password request error:', err);
    return res.status(500).json({ error: 'Failed to approve password request: ' + err.message });
  }
});

// POST /api/settings/password-requests/:id/reject (Super Admin rejects password change)
router.post('/password-requests/:id/reject', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { reason = 'Request declined by Super Admin' } = req.body;
    const pcr = queryGet('SELECT * FROM password_change_requests WHERE id = ?', [requestId]);
    if (!pcr) {
      return res.status(404).json({ error: 'Password request not found.' });
    }
    if (pcr.status !== 'PENDING') {
      return res.status(400).json({ error: `Request has already been ${pcr.status.toLowerCase()}.` });
    }

    const employee = queryGet('SELECT id, full_name, employee_id FROM users WHERE id = ?', [pcr.user_id]);

    // Update request status
    queryRun(`
      UPDATE password_change_requests SET
        status = 'REJECTED',
        rejection_reason = ?,
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [reason.trim(), req.user.id, requestId]);

    // Audit log (DO NOT log password)
    logAdminActivity(
      req.user.id,
      'PASSWORD_REQUEST_REJECTED',
      `Super Admin rejected password change request for ${employee ? employee.full_name : 'User'} (${reason.trim()})`,
      requestId,
      pcr.user_id
    );

    // Notify employee
    if (employee) {
      createNotification(
        employee.id,
        'Password Request Rejected',
        `Your password change request was rejected. Reason: ${reason.trim()}. Your existing password remains unchanged.`,
        'PASSWORD_REQUEST_REJECTED'
      );
    }

    return res.json({
      message: `Password change request for ${employee?.full_name || 'employee'} was rejected.`,
      status: 'REJECTED'
    });
  } catch (err) {
    console.error('Reject password request error:', err);
    return res.status(500).json({ error: 'Failed to reject password request: ' + err.message });
  }
});

module.exports = router;
