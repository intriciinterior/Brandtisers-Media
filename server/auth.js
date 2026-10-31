const jwt = require('jsonwebtoken');
const { queryGet, queryRun } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'it_task_mgmt_super_secure_jwt_secret_key_2026';
const TOKEN_EXPIRY = '7d';

function generateToken(user, originalUser = null) {
  const payload = {
    id: user.id,
    employee_id: user.employee_id,
    full_name: user.full_name,
    username: user.username,
    email: user.email,
    role: user.role,
    department: user.department,
    designation: user.designation,
    avatar_color: user.avatar_color
  };

  if (originalUser) {
    payload.original_user = {
      id: originalUser.id,
      employee_id: originalUser.employee_id,
      full_name: originalUser.full_name,
      username: originalUser.username,
      email: originalUser.email,
      role: originalUser.role
    };
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if target user still exists and is active in database
    const user = queryGet(`
      SELECT id, employee_id, full_name, username, email, phone, mobile_number, department, designation, role, status, avatar_color, profile_photo, is_deleted, must_change_password
      FROM users WHERE id = ?
    `, [decoded.id]);

    if (!user || user.is_deleted) {
      return res.status(401).json({ error: 'User account not found or has been deactivated.' });
    }

    user.must_change_password = Boolean(user.must_change_password);

    if (user.status === 'INACTIVE') {
      return res.status(403).json({ error: 'Account is deactivated. Contact an administrator.' });
    }

    // Verify impersonation state if present in token
    if (decoded.original_user) {
      const originalUser = queryGet(`
        SELECT id, employee_id, full_name, username, email, role, status, is_deleted
        FROM users WHERE id = ?
      `, [decoded.original_user.id]);

      if (!originalUser || originalUser.is_deleted || originalUser.status === 'INACTIVE') {
        return res.status(401).json({ error: 'Original administrator account is no longer valid or active.' });
      }

      // Role check: Only SUPER_ADMIN can impersonate
      if (originalUser.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only Super Admin is permitted to use Login as User.' });
      }

      user.is_impersonated = true;
      user.original_user = {
        id: originalUser.id,
        employee_id: originalUser.employee_id,
        full_name: originalUser.full_name,
        username: originalUser.username,
        email: originalUser.email,
        role: originalUser.role
      };
    } else {
      user.is_impersonated = false;
      user.original_user = null;
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Permission denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
}

function logAdminActivity(userId, action, details, relatedTaskId = null, relatedUserId = null) {
  try {
    queryRun(`
      INSERT INTO system_activity_logs (user_id, action_type, description, target_id)
      VALUES (?, ?, ?, ?)
    `, [userId, action, details, relatedTaskId || relatedUserId]);
  } catch (err) {
    console.error('Failed to log admin activity:', err);
  }
}

function createNotification(userId, title, message, type = 'INFO', relatedTaskId = null) {
  try {
    queryRun(`
      INSERT INTO notifications (user_id, title, message, type, related_task_id, is_read)
      VALUES (?, ?, ?, ?, ?, 0)
    `, [userId, title, message, type, relatedTaskId]);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticate,
  requireRole,
  logAdminActivity,
  createNotification
};
