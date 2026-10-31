const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'it_task_tracker.sqlite');

let dbInstance = null;
let SQL = null;

function saveDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database:', err);
  }
}

async function getDb() {
  if (dbInstance) return dbInstance;

  SQL = await initSqlJs();
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Existing database invalid, creating fresh one:', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema();
  seedInitialData();
  saveDb();
  return dbInstance;
}

function initSchema() {
  dbInstance.run(`
    -- 1. Company Configuration & Branding
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      company_name TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      tagline TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      website TEXT DEFAULT '',
      time_zone TEXT DEFAULT 'Asia/Kolkata',
      setup_completed INTEGER NOT NULL DEFAULT 0,
      smtp_host TEXT DEFAULT '',
      smtp_port INTEGER DEFAULT 587,
      smtp_secure INTEGER DEFAULT 0,
      smtp_user TEXT DEFAULT '',
      smtp_pass TEXT DEFAULT '',
      smtp_from_name TEXT DEFAULT '',
      smtp_from_email TEXT DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Users (Strict Two Roles: SUPER_ADMIN and EMPLOYEE)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile_number TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      department TEXT DEFAULT 'IT Operations',
      designation TEXT NOT NULL DEFAULT 'IT Specialist',
      role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'EMPLOYEE')),
      password_hash TEXT NOT NULL,
      joining_date TEXT DEFAULT CURRENT_DATE,
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
      avatar_color TEXT DEFAULT '#2563EB',
      profile_photo TEXT DEFAULT '',
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Dynamic Clients Management
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      company_name TEXT DEFAULT '',
      contact_person TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
      notes TEXT DEFAULT '',
      created_by INTEGER REFERENCES users(id),
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Dynamic Work Types Management
    CREATE TABLE IF NOT EXISTS work_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
      sort_order INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Daily Tasks
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT UNIQUE NOT NULL,
      client_id INTEGER REFERENCES clients(id),
      client_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      instructions TEXT DEFAULT '',
      work_type TEXT NOT NULL,
      work_category TEXT DEFAULT 'NORMAL' CHECK(work_category IN ('NORMAL', 'ADVANCE')),
      assigned_to INTEGER NOT NULL REFERENCES users(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      priority TEXT DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE')),
      progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
      task_date TEXT NOT NULL,
      start_time TEXT,
      deadline TEXT NOT NULL,
      expected_completion TEXT,
      additional_instructions TEXT,
      attachment_name TEXT,
      attachment_path TEXT,
      completed_at TEXT,
      completion_summary TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Task Progress Updates
    CREATE TABLE IF NOT EXISTS task_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      progress INTEGER NOT NULL,
      expected_completion TEXT,
      work_update TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. Task Activity Log
    CREATE TABLE IF NOT EXISTS task_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      action_type TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Employee Work Reports (Daily / Weekly / Monthly Work Log)
    CREATE TABLE IF NOT EXISTS work_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES users(id),
      report_type TEXT NOT NULL CHECK(report_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
      report_date TEXT NOT NULL,
      date_start TEXT,
      date_end TEXT,
      total_quantity INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 9. Work Report Line Entries
    CREATE TABLE IF NOT EXISTS work_report_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,
      entry_date TEXT NOT NULL,
      work_type_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      client_name TEXT DEFAULT '',
      task_title TEXT DEFAULT '',
      status TEXT DEFAULT '',
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 10. Report Email / Download Logs
    CREATE TABLE IF NOT EXISTS report_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      report_type TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT DEFAULT '',
      file_name TEXT,
      status TEXT NOT NULL DEFAULT 'SENT',
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 11. System Activity Logs (Super Admin Auditing)
    CREATE TABLE IF NOT EXISTS system_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action_type TEXT NOT NULL,
      description TEXT NOT NULL,
      target_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 12. Notifications (Strictly User Scoped)
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'INFO',
      related_task_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 13. Password Change Requests (Super Admin Approval Flow)
    CREATE TABLE IF NOT EXISTS password_change_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      requested_password_hash TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TEXT,
      rejection_reason TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration check: Add must_change_password column to users if missing
  try {
    const tableInfo = queryAll("PRAGMA table_info(users)");
    const hasMustChange = tableInfo.some(col => col.name === 'must_change_password');
    if (!hasMustChange) {
      dbInstance.run("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0");
    }
  } catch (err) {
    console.warn("Migration warning for users.must_change_password:", err.message);
  }
}

function seedInitialData() {
  // 1. Ensure Company Settings row exists with setup_completed = 0
  const existingCompany = queryGet('SELECT id, setup_completed FROM company_settings WHERE id = 1');
  if (!existingCompany) {
    queryRun(`
      INSERT INTO company_settings (id, company_name, logo_url, tagline, email, phone, address, website, time_zone, setup_completed)
      VALUES (1, '', '', '', '', '', '', '', 'Asia/Kolkata', 0)
    `);
  }

  // 2. Ensure Super Admin user exists
  const superAdmin = queryGet(`SELECT id FROM users WHERE role = 'SUPER_ADMIN'`);
  if (!superAdmin) {
    const defaultHash = bcrypt.hashSync('admin123', 10);
    queryRun(`
      INSERT INTO users (
        employee_id, full_name, username, email, mobile_number,
        department, designation, role, password_hash, status, avatar_color
      ) VALUES (
        'ADMIN-001', 'Super Administrator', 'superadmin', 'superadmin@company.local', '',
        'IT Management', 'Super Admin', 'SUPER_ADMIN', ?, 'ACTIVE', '#2563EB'
      )
    `, [defaultHash]);
    console.log('Initialized clean Super Admin: username=superadmin, password=admin123');
  }

  // 3. No fake clients, employees, tasks, or reports are created. System starts 100% clean.
}

// Helper methods to query sql.js easily
function queryAll(sql, params = []) {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryGet(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function queryRun(sql, params = []) {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  
  const lastIdRes = dbInstance.exec('SELECT last_insert_rowid() as id, changes() as changes;');
  let lastInsertRowid = 0;
  let changes = 0;
  if (lastIdRes.length && lastIdRes[0].values.length) {
    lastInsertRowid = lastIdRes[0].values[0][0];
    changes = lastIdRes[0].values[0][1];
  }
  saveDb();
  return { lastInsertRowid, changes };
}

// Generate next unique task ID like IT-2026-001
function generateNextTaskId() {
  const year = new Date().getFullYear();
  const pattern = `IT-${year}-%`;
  const latest = queryGet(`SELECT task_id FROM tasks WHERE task_id LIKE ? ORDER BY id DESC LIMIT 1`, [pattern]);
  
  if (!latest || !latest.task_id) {
    return `IT-${year}-001`;
  }
  
  const parts = latest.task_id.split('-');
  const seq = parseInt(parts[2], 10) || 0;
  const nextSeq = String(seq + 1).padStart(3, '0');
  return `IT-${year}-${nextSeq}`;
}

// Log system activity for Super Admin
function logSystemActivity(userId, actionType, description, targetId = null) {
  try {
    queryRun(`
      INSERT INTO system_activity_logs (user_id, action_type, description, target_id)
      VALUES (?, ?, ?, ?)
    `, [userId, actionType, description, targetId]);
  } catch (err) {
    console.error('Failed to log system activity:', err);
  }
}

// Create notification helper
function createNotification(userId, title, message, type = 'INFO', relatedTaskId = null) {
  try {
    queryRun(`
      INSERT INTO notifications (user_id, title, message, type, related_task_id)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, title, message, type, relatedTaskId]);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

module.exports = {
  getDb,
  queryAll,
  queryGet,
  queryRun,
  saveDb,
  generateNextTaskId,
  logSystemActivity,
  createNotification
};
