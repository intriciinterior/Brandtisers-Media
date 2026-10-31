const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');
const { queryAll, queryGet, queryRun } = require('../db');
const { authenticate, requireRole, logAdminActivity } = require('../auth');

// GET /api/reports/daily (Super Admin Daily Operations Report)
router.get('/daily', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
    const clientFilter = req.query.client;
    const workTypeFilter = req.query.work_type;
    const nowTs = Date.now();

    let sql = `
      SELECT t.*, u.full_name as member_name, u.employee_id as member_emp_id, u.avatar_color as member_avatar_color
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.task_date = ? AND t.is_deleted = 0
    `;
    const params = [selectedDate];

    if (clientFilter && clientFilter !== 'ALL') {
      sql += ` AND LOWER(t.client_name) = ?`;
      params.push(clientFilter.toLowerCase().trim());
    }

    if (workTypeFilter && workTypeFilter !== 'ALL') {
      sql += ` AND t.work_type = ?`;
      params.push(workTypeFilter);
    }

    sql += ` ORDER BY t.priority DESC, t.deadline ASC`;
    const tasks = queryAll(sql, params);

    // Fetch all active employees
    const allEmployees = queryAll(`
      SELECT id, full_name, employee_id, designation, avatar_color
      FROM users
      WHERE is_deleted = 0 AND role = 'EMPLOYEE'
      ORDER BY full_name ASC
    `);

    const memberMap = {};
    allEmployees.forEach(m => {
      memberMap[m.id] = {
        id: m.id,
        name: m.full_name,
        employee_id: m.employee_id,
        designation: m.designation,
        avatar_color: m.avatar_color,
        assigned: 0,
        completed: 0,
        in_progress: 0,
        pending: 0,
        overdue: 0,
        advance: 0,
        total_work_quantity: 0
      };
    });

    // Also get daily work report quantities for these employees
    const workReportsToday = queryAll(`
      SELECT employee_id, total_quantity FROM work_reports WHERE report_date = ? AND report_type = 'DAILY'
    `, [selectedDate]);

    workReportsToday.forEach(wr => {
      if (memberMap[wr.employee_id]) {
        memberMap[wr.employee_id].total_work_quantity = wr.total_quantity;
      }
    });

    let totalTasks = tasks.length;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let overdue = 0;
    let advanceWork = 0;

    tasks.forEach(t => {
      if (t.work_category === 'ADVANCE') advanceWork++;
      const isOverdue = t.status !== 'COMPLETED' && t.deadline && new Date(t.deadline).getTime() < nowTs;

      if (t.status === 'COMPLETED') completed++;
      else if (t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED') inProgress++;
      else if (t.status === 'PENDING') pending++;

      if (isOverdue) overdue++;

      if (memberMap[t.assigned_to]) {
        const mem = memberMap[t.assigned_to];
        mem.assigned++;
        if (t.status === 'COMPLETED') mem.completed++;
        else if (t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED') mem.in_progress++;
        else if (t.status === 'PENDING') mem.pending++;
        if (isOverdue) mem.overdue++;
        if (t.work_category === 'ADVANCE') mem.advance++;
      }
    });

    const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    const memberBreakdown = Object.values(memberMap).map(m => ({
      ...m,
      completion_rate: m.assigned > 0 ? Math.round((m.completed / m.assigned) * 100) : 0
    })).sort((a, b) => b.completed - a.completed);

    return res.json({
      date: selectedDate,
      summary: {
        totalEmployees: allEmployees.length,
        totalTasks,
        completed,
        inProgress,
        pending,
        overdue,
        advanceWork,
        completionRate
      },
      memberBreakdown,
      tasks
    });
  } catch (err) {
    console.error('Daily report error:', err);
    return res.status(500).json({ error: 'Failed to generate daily report.' });
  }
});

// GET /api/reports/monthly (Super Admin Monthly Data Dashboard)
router.get('/monthly', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const yearMonth = req.query.month || new Date().toISOString().substring(0, 7);
    const clientFilter = req.query.client;
    const employeeFilter = req.query.employee_id;
    const statusFilter = req.query.status;
    const workTypeFilter = req.query.work_type;
    const nowTs = Date.now();

    let sql = `
      SELECT t.*, u.full_name as member_name, u.employee_id as member_emp_id, u.avatar_color as member_avatar_color
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.task_date LIKE ? AND t.is_deleted = 0
    `;
    const params = [`${yearMonth}%`];

    if (clientFilter && clientFilter !== 'ALL') {
      sql += ` AND LOWER(t.client_name) = ?`;
      params.push(clientFilter.toLowerCase().trim());
    }
    if (employeeFilter && employeeFilter !== 'ALL') {
      sql += ` AND t.assigned_to = ?`;
      params.push(Number(employeeFilter));
    }
    if (statusFilter && statusFilter !== 'ALL') {
      sql += ` AND t.status = ?`;
      params.push(statusFilter);
    }
    if (workTypeFilter && workTypeFilter !== 'ALL') {
      sql += ` AND t.work_type = ?`;
      params.push(workTypeFilter);
    }

    sql += ` ORDER BY t.task_date DESC, t.id DESC`;
    const tasks = queryAll(sql, params);

    const allEmployees = queryAll(`
      SELECT id, full_name, employee_id, designation, avatar_color
      FROM users
      WHERE is_deleted = 0 AND role = 'EMPLOYEE'
      ORDER BY full_name ASC
    `);

    // Fetch month work report quantities for each employee
    const monthlyReports = queryAll(`
      SELECT employee_id, SUM(total_quantity) as month_qty
      FROM work_reports
      WHERE report_date LIKE ?
      GROUP BY employee_id
    `, [`${yearMonth}%`]);

    const qtyMap = {};
    monthlyReports.forEach(r => {
      qtyMap[r.employee_id] = r.month_qty || 0;
    });

    // Unfiltered month tasks for overall KPI summary
    const allMonthTasks = queryAll(`
      SELECT * FROM tasks WHERE task_date LIKE ? AND is_deleted = 0
    `, [`${yearMonth}%`]);

    const totalTeamTasks = allMonthTasks.length;
    const completedTeamTasks = allMonthTasks.filter(t => t.status === 'COMPLETED').length;
    const inProgressTeamTasks = allMonthTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED').length;
    const pendingTeamTasks = allMonthTasks.filter(t => t.status === 'PENDING').length;
    const advanceCompletedTeamTasks = allMonthTasks.filter(t => t.status === 'COMPLETED' && t.work_category === 'ADVANCE').length;

    let overdueTeamTasks = 0;
    allMonthTasks.forEach(t => {
      if (t.status !== 'COMPLETED' && t.deadline && new Date(t.deadline).getTime() < nowTs) {
        overdueTeamTasks++;
      }
    });

    const overallCompletion = totalTeamTasks > 0 ? Math.round((completedTeamTasks / totalTeamTasks) * 100) : 0;

    const employeeBreakdown = allEmployees.map(m => {
      const mTasks = allMonthTasks.filter(t => t.assigned_to === m.id);
      const assigned = mTasks.length;
      const completed = mTasks.filter(t => t.status === 'COMPLETED').length;
      const inProgress = mTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED').length;
      const pending = mTasks.filter(t => t.status === 'PENDING').length;
      const advanceCompleted = mTasks.filter(t => t.status === 'COMPLETED' && t.work_category === 'ADVANCE').length;
      let overdue = 0;
      mTasks.forEach(t => {
        if (t.status !== 'COMPLETED' && t.deadline && new Date(t.deadline).getTime() < nowTs) {
          overdue++;
        }
      });
      const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

      return {
        id: m.id,
        name: m.full_name,
        employee_id: m.employee_id,
        designation: m.designation,
        avatar_color: m.avatar_color,
        assigned,
        completed,
        in_progress: inProgress,
        pending,
        overdue,
        advance_completed: advanceCompleted,
        total_work_quantity: qtyMap[m.id] || 0,
        completion_rate: completionRate
      };
    });

    const [yearPart, monthPart] = yearMonth.split('-');
    const monthDate = new Date(Number(yearPart), Number(monthPart) - 1, 1);
    const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return res.json({
      month: yearMonth,
      monthLabel,
      totalEmployees: allEmployees.length,
      totalTeamTasks,
      completedMonthly: completedTeamTasks,
      inProgressMonthly: inProgressTeamTasks,
      pendingMonthly: pendingTeamTasks,
      overdueMonthly: overdueTeamTasks,
      advanceCompletedMonthly: advanceCompletedTeamTasks,
      overallCompletion,
      employeeBreakdown,
      tasks
    });
  } catch (err) {
    console.error('Monthly report error:', err);
    return res.status(500).json({ error: 'Failed to generate monthly report.' });
  }
});

// POST /api/reports/export-excel (Super Admin exports comprehensive Excel report)
router.post('/export-excel', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const { report_type = 'MONTHLY', date, start_date, end_date, month, employee_id, client, work_type } = req.body;
    const company = queryGet('SELECT company_name FROM company_settings WHERE id = 1');

    let sql = `
      SELECT t.*, u.full_name as assignee_name, u.employee_id as assignee_emp_id
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.is_deleted = 0
    `;
    const params = [];

    let periodLabel = '';
    if (report_type === 'DAILY') {
      const d = date || new Date().toISOString().split('T')[0];
      periodLabel = `Date: ${d}`;
      sql += ` AND t.task_date = ?`;
      params.push(d);
    } else if (report_type === 'WEEKLY' || report_type === 'CUSTOM') {
      const s = start_date || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const e = end_date || new Date().toISOString().split('T')[0];
      periodLabel = `Period: ${s} to ${e}`;
      sql += ` AND t.task_date BETWEEN ? AND ?`;
      params.push(s, e);
    } else {
      const m = month || new Date().toISOString().substring(0, 7);
      periodLabel = `Month: ${m}`;
      sql += ` AND t.task_date LIKE ?`;
      params.push(`${m}%`);
    }

    if (employee_id && employee_id !== 'ALL') {
      sql += ` AND t.assigned_to = ?`;
      params.push(Number(employee_id));
    }
    if (client && client !== 'ALL') {
      sql += ` AND LOWER(t.client_name) = ?`;
      params.push(client.toLowerCase().trim());
    }
    if (work_type && work_type !== 'ALL') {
      sql += ` AND t.work_type = ?`;
      params.push(work_type);
    }

    sql += ` ORDER BY t.task_date DESC, t.id DESC`;
    const tasks = queryAll(sql, params);

    // Build Excel
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['COMPANY:', company?.company_name || 'IT Operations'],
      ['REPORT:', `SUPER ADMIN IT OPERATIONS AUDIT REPORT`],
      ['FILTER / PERIOD:', periodLabel],
      ['GENERATED ON:', new Date().toLocaleString()],
      [],
      ['Task ID', 'Client Name', 'Task Title', 'Assigned To', 'Employee ID', 'Work Type', 'Work Category', 'Priority', 'Status', 'Progress %', 'Date', 'Deadline', 'Completed At']
    ];

    tasks.forEach(t => {
      wsData.push([
        t.task_id,
        t.client_name,
        t.title,
        t.assignee_name || '—',
        t.assignee_emp_id || '—',
        t.work_type,
        t.work_category,
        t.priority,
        t.status,
        `${t.progress}%`,
        t.task_date,
        t.deadline,
        t.completed_at || '—'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 14 }, { wch: 22 }, { wch: 30 }, { wch: 20 }, { wch: 14 },
      { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
      { wch: 14 }, { wch: 20 }, { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Audit Report');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `IT_Operations_Report_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Super Admin Excel export error:', err);
    return res.status(500).json({ error: 'Failed to generate Excel report: ' + err.message });
  }
});

// POST /api/reports/send-email (Super Admin sends report via email)
router.post('/send-email', authenticate, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { recipient_email, subject, message, report_type, date, start_date, end_date, month, employee_id, client } = req.body;

    if (!recipient_email || !recipient_email.trim()) {
      return res.status(400).json({ error: 'Recipient email address is required.' });
    }

    const company = queryGet('SELECT * FROM company_settings WHERE id = 1');
    if (!company || !company.smtp_host || !company.smtp_user) {
      return res.status(400).json({
        error: 'Email service is not yet configured. Please configure SMTP settings in Settings -> Email Configuration before sending reports.'
      });
    }

    // Build the Excel buffer (same query as export-excel)
    let sql = `
      SELECT t.*, u.full_name as assignee_name, u.employee_id as assignee_emp_id
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.is_deleted = 0
    `;
    const params = [];
    let periodLabel = '';
    if (report_type === 'DAILY') {
      const d = date || new Date().toISOString().split('T')[0];
      periodLabel = `Date: ${d}`;
      sql += ` AND t.task_date = ?`;
      params.push(d);
    } else if (report_type === 'WEEKLY' || report_type === 'CUSTOM') {
      const s = start_date || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const e = end_date || new Date().toISOString().split('T')[0];
      periodLabel = `Period: ${s} to ${e}`;
      sql += ` AND t.task_date BETWEEN ? AND ?`;
      params.push(s, e);
    } else {
      const m = month || new Date().toISOString().substring(0, 7);
      periodLabel = `Month: ${m}`;
      sql += ` AND t.task_date LIKE ?`;
      params.push(`${m}%`);
    }

    if (employee_id && employee_id !== 'ALL') {
      sql += ` AND t.assigned_to = ?`;
      params.push(Number(employee_id));
    }
    if (client && client !== 'ALL') {
      sql += ` AND LOWER(t.client_name) = ?`;
      params.push(client.toLowerCase().trim());
    }

    sql += ` ORDER BY t.task_date DESC, t.id DESC`;
    const tasks = queryAll(sql, params);

    const wb = XLSX.utils.book_new();
    const wsData = [
      ['COMPANY:', company.company_name || 'IT Operations'],
      ['REPORT:', `SUPER ADMIN IT OPERATIONS AUDIT REPORT`],
      ['FILTER / PERIOD:', periodLabel],
      ['GENERATED ON:', new Date().toLocaleString()],
      [],
      ['Task ID', 'Client Name', 'Task Title', 'Assigned To', 'Employee ID', 'Work Type', 'Work Category', 'Priority', 'Status', 'Progress %', 'Date', 'Deadline', 'Completed At']
    ];

    tasks.forEach(t => {
      wsData.push([
        t.task_id,
        t.client_name,
        t.title,
        t.assignee_name || '—',
        t.assignee_emp_id || '—',
        t.work_type,
        t.work_category,
        t.priority,
        t.status,
        `${t.progress}%`,
        t.task_date,
        t.deadline,
        t.completed_at || '—'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Report');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `IT_Operations_Report_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

    const transporter = nodemailer.createTransport({
      host: company.smtp_host,
      port: Number(company.smtp_port) || 587,
      secure: Boolean(company.smtp_secure),
      auth: {
        user: company.smtp_user,
        pass: company.smtp_pass || ''
      }
    });

    const mailSubject = subject || `IT Operations Report - ${company.company_name || 'IT Dept'} (${periodLabel})`;
    const mailBody = message || `Please find attached the official IT Operations Report for ${periodLabel}.\n\nTotal Tasks: ${tasks.length}\n\nGenerated from ${company.company_name || 'IT Operations System'}.`;

    await transporter.sendMail({
      from: `"${company.smtp_from_name || company.company_name || 'IT Operations'}" <${company.smtp_from_email || company.smtp_user}>`,
      to: recipient_email.trim(),
      subject: mailSubject,
      text: mailBody,
      attachments: [{ filename, content: buffer }]
    });

    queryRun(`
      INSERT INTO report_logs (user_id, report_type, recipient_email, subject, message, file_name, status)
      VALUES (?, ?, ?, ?, ?, ?, 'SENT')
    `, [req.user.id, report_type || 'ADMIN_REPORT', recipient_email.trim(), mailSubject, message, filename]);

    logAdminActivity(req.user.id, 'REPORT_SENT', `Super Admin sent operations report to ${recipient_email.trim()}`);

    return res.json({
      message: 'Report Sent Successfully',
      recipient: recipient_email.trim(),
      filename
    });
  } catch (err) {
    console.error('Send admin report email error:', err);
    return res.status(500).json({ error: 'Failed to send report: ' + err.message });
  }
});

module.exports = router;
