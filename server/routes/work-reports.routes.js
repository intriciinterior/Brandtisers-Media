const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');
const { queryAll, queryGet, queryRun } = require('../db');
const { authenticate, requireRole, logAdminActivity } = require('../auth');

// Helper to build real .xlsx workbook buffer
function generateExcelBuffer({
  companyName = 'IT Operations',
  employeeName,
  employeeId,
  reportType = 'DAILY',
  dateRangeStr,
  rows = [],
  totals = {}
}) {
  const wb = XLSX.utils.book_new();

  // Construct sheet data array
  const wsData = [
    ['COMPANY:', companyName],
    ['REPORT TYPE:', `${reportType} WORK & PERFORMANCE REPORT`],
    ['EMPLOYEE NAME:', employeeName],
    ['EMPLOYEE ID:', employeeId],
    ['DATE / PERIOD:', dateRangeStr],
    ['GENERATED ON:', new Date().toLocaleString()],
    [], // empty row
    // Headers
    ['Date', 'Work Type / Category', 'Client / Task Reference', 'Status', 'Quantity', 'Notes / Description']
  ];

  rows.forEach(r => {
    wsData.push([
      r.date || '',
      r.work_type_name || '',
      r.client_or_task || '—',
      r.status || '—',
      Number(r.quantity) || 0,
      r.description || ''
    ]);
  });

  // Summary Totals row
  wsData.push([]);
  wsData.push(['', '', '', 'TOTAL WORK UNITS:', totals.totalQuantity || 0, '']);
  if (totals.totalTasks !== undefined) {
    wsData.push(['', '', '', 'TASKS METRICS:', `Total: ${totals.totalTasks} | Completed: ${totals.completed || 0} | In Progress: ${totals.inProgress || 0} | Pending: ${totals.pending || 0}`, '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 24 }, // Work Type
    { wch: 28 }, // Client/Task
    { wch: 14 }, // Status
    { wch: 12 }, // Quantity
    { wch: 40 }  // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, `${reportType} Report`);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// GET /api/work-reports/daily (Fetch employee's daily report for a specific date)
router.get('/daily', authenticate, (req, res) => {
  try {
    const isEmployee = req.user.role === 'EMPLOYEE';
    let targetEmployeeId = req.user.id;

    if (!isEmployee && req.query.employee_id) {
      targetEmployeeId = Number(req.query.employee_id);
    } else if (isEmployee && req.query.employee_id && Number(req.query.employee_id) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You can only view your own work reports.' });
    }

    const reportDate = req.query.date || new Date().toISOString().split('T')[0];

    const report = queryGet(`
      SELECT * FROM work_reports 
      WHERE employee_id = ? AND report_type = 'DAILY' AND report_date = ?
    `, [targetEmployeeId, reportDate]);

    let entries = [];
    let totalQuantity = 0;

    if (report) {
      entries = queryAll(`
        SELECT * FROM work_report_entries WHERE report_id = ? ORDER BY id ASC
      `, [report.id]);
      totalQuantity = report.total_quantity;
    }

    // Also fetch tasks assigned on that day for context
    const dailyTasks = queryAll(`
      SELECT id, task_id, client_name, title, status, progress, work_type
      FROM tasks 
      WHERE assigned_to = ? AND task_date = ? AND is_deleted = 0
    `, [targetEmployeeId, reportDate]);

    return res.json({
      date: reportDate,
      employee_id: targetEmployeeId,
      report_id: report?.id || null,
      entries,
      total_quantity: totalQuantity,
      daily_tasks: dailyTasks
    });
  } catch (err) {
    console.error('Daily work report fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch daily work report.' });
  }
});

// POST /api/work-reports/daily (Save/submit daily work report entries)
router.post('/daily', authenticate, (req, res) => {
  try {
    const isEmployee = req.user.role === 'EMPLOYEE';
    let targetEmployeeId = req.user.id;

    if (!isEmployee && req.body.employee_id) {
      targetEmployeeId = Number(req.body.employee_id);
    } else if (isEmployee && req.body.employee_id && Number(req.body.employee_id) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You can only record your own work reports.' });
    }

    const { date, entries = [], notes = '' } = req.body;
    const reportDate = date || new Date().toISOString().split('T')[0];

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'At least one work entry is required.' });
    }

    // Calculate total quantity
    let totalQuantity = 0;
    entries.forEach(e => {
      const q = Math.max(0, parseInt(e.quantity, 10) || 0);
      totalQuantity += q;
    });

    // Check existing daily report
    let report = queryGet(`
      SELECT id FROM work_reports 
      WHERE employee_id = ? AND report_type = 'DAILY' AND report_date = ?
    `, [targetEmployeeId, reportDate]);

    let reportId;
    if (report) {
      reportId = report.id;
      queryRun(`
        UPDATE work_reports SET total_quantity = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [totalQuantity, notes.trim(), reportId]);
      // Remove old entries and replace with updated ones
      queryRun('DELETE FROM work_report_entries WHERE report_id = ?', [reportId]);
    } else {
      const insert = queryRun(`
        INSERT INTO work_reports (employee_id, report_type, report_date, total_quantity, notes)
        VALUES (?, 'DAILY', ?, ?, ?)
      `, [targetEmployeeId, reportDate, totalQuantity, notes.trim()]);
      reportId = insert.lastInsertRowid;
    }

    // Insert entries
    entries.forEach(e => {
      if (e.work_type_name && e.work_type_name.trim()) {
        const q = Math.max(0, parseInt(e.quantity, 10) || 0);
        queryRun(`
          INSERT INTO work_report_entries (
            report_id, entry_date, work_type_name, quantity, client_name, task_title, status, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          reportId,
          reportDate,
          e.work_type_name.trim(),
          q,
          (e.client_name || '').trim(),
          (e.task_title || '').trim(),
          (e.status || '').trim(),
          (e.description || '').trim()
        ]);
      }
    });

    return res.json({
      message: 'Daily Work Report saved successfully!',
      report_id: reportId,
      total_quantity: totalQuantity
    });
  } catch (err) {
    console.error('Save daily report error:', err);
    return res.status(500).json({ error: 'Failed to save daily work report: ' + err.message });
  }
});

// GET /api/work-reports/weekly (Weekly Work Report View)
router.get('/weekly', authenticate, (req, res) => {
  try {
    const isEmployee = req.user.role === 'EMPLOYEE';
    let targetEmployeeId = req.user.id;

    if (!isEmployee && req.query.employee_id) {
      targetEmployeeId = Number(req.query.employee_id);
    } else if (isEmployee && req.query.employee_id && Number(req.query.employee_id) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Default to current week (last 7 days or Monday to Sunday)
    const today = new Date();
    const startDate = req.query.start_date || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
    const endDate = req.query.end_date || today.toISOString().split('T')[0];

    // Fetch entries between startDate and endDate
    const entries = queryAll(`
      SELECT wre.* 
      FROM work_report_entries wre
      JOIN work_reports wr ON wre.report_id = wr.id
      WHERE wr.employee_id = ? AND wre.entry_date BETWEEN ? AND ?
      ORDER BY wre.entry_date ASC, wre.id ASC
    `, [targetEmployeeId, startDate, endDate]);

    let weeklyTotal = 0;
    const dayWiseMap = {};

    entries.forEach(e => {
      weeklyTotal += (e.quantity || 0);
      if (!dayWiseMap[e.entry_date]) {
        dayWiseMap[e.entry_date] = { date: e.entry_date, total: 0, items: [] };
      }
      dayWiseMap[e.entry_date].total += (e.quantity || 0);
      dayWiseMap[e.entry_date].items.push(e);
    });

    const dayBreakdown = Object.values(dayWiseMap);

    // Fetch task metrics during this week
    const weekTasks = queryAll(`
      SELECT * FROM tasks 
      WHERE assigned_to = ? AND task_date BETWEEN ? AND ? AND is_deleted = 0
    `, [targetEmployeeId, startDate, endDate]);

    const totalTasks = weekTasks.length;
    const completedTasks = weekTasks.filter(t => t.status === 'COMPLETED').length;

    return res.json({
      start_date: startDate,
      end_date: endDate,
      employee_id: targetEmployeeId,
      weekly_total: weeklyTotal,
      entries,
      day_breakdown: dayBreakdown,
      task_summary: {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
    });
  } catch (err) {
    console.error('Weekly report error:', err);
    return res.status(500).json({ error: 'Failed to generate weekly report.' });
  }
});

// GET /api/work-reports/monthly (Monthly Work Report View)
router.get('/monthly', authenticate, (req, res) => {
  try {
    const isEmployee = req.user.role === 'EMPLOYEE';
    let targetEmployeeId = req.user.id;

    if (!isEmployee && req.query.employee_id) {
      targetEmployeeId = Number(req.query.employee_id);
    } else if (isEmployee && req.query.employee_id && Number(req.query.employee_id) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const monthStr = req.query.month || new Date().toISOString().substring(0, 7); // e.g. "2026-10"

    // Fetch entries for this month
    const entries = queryAll(`
      SELECT wre.* 
      FROM work_report_entries wre
      JOIN work_reports wr ON wre.report_id = wr.id
      WHERE wr.employee_id = ? AND wre.entry_date LIKE ?
      ORDER BY wre.entry_date DESC, wre.id DESC
    `, [targetEmployeeId, `${monthStr}%`]);

    let monthlyTotalWork = 0;
    const workTypeMap = {};

    entries.forEach(e => {
      monthlyTotalWork += (e.quantity || 0);
      const wt = e.work_type_name || 'General';
      if (!workTypeMap[wt]) workTypeMap[wt] = 0;
      workTypeMap[wt] += (e.quantity || 0);
    });

    const workTypeBreakdown = Object.entries(workTypeMap).map(([name, qty]) => ({
      name,
      quantity: qty
    })).sort((a, b) => b.quantity - a.quantity);

    // Fetch month task KPIs
    const monthTasks = queryAll(`
      SELECT * FROM tasks 
      WHERE assigned_to = ? AND task_date LIKE ? AND is_deleted = 0
      ORDER BY task_date DESC, id DESC
    `, [targetEmployeeId, `${monthStr}%`]);

    const nowTs = Date.now();
    const totalTasks = monthTasks.length;
    const completed = monthTasks.filter(t => t.status === 'COMPLETED').length;
    const inProgress = monthTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED').length;
    const pending = monthTasks.filter(t => t.status === 'PENDING').length;
    const advanceWork = monthTasks.filter(t => t.work_category === 'ADVANCE').length;

    let overdue = 0;
    monthTasks.forEach(t => {
      if (t.status !== 'COMPLETED' && t.deadline && new Date(t.deadline).getTime() < nowTs) {
        overdue++;
      }
    });

    const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    return res.json({
      month: monthStr,
      employee_id: targetEmployeeId,
      monthly_total_work: monthlyTotalWork,
      work_type_breakdown: workTypeBreakdown,
      entries,
      task_metrics: {
        totalTasks,
        completed,
        inProgress,
        pending,
        overdue,
        advanceWork,
        completionRate
      },
      tasks: monthTasks
    });
  } catch (err) {
    console.error('Monthly report error:', err);
    return res.status(500).json({ error: 'Failed to generate monthly report.' });
  }
});

// POST /api/work-reports/export-excel (Generate real downloadable .xlsx file)
router.post('/export-excel', authenticate, (req, res) => {
  try {
    const isEmployee = req.user.role === 'EMPLOYEE';
    let targetEmployeeId = req.user.id;

    if (!isEmployee && req.body.employee_id) {
      targetEmployeeId = Number(req.body.employee_id);
    } else if (isEmployee && req.body.employee_id && Number(req.body.employee_id) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { report_type = 'DAILY', date, start_date, end_date, month } = req.body;

    const employee = queryGet('SELECT full_name, employee_id FROM users WHERE id = ?', [targetEmployeeId]);
    const company = queryGet('SELECT company_name FROM company_settings WHERE id = 1');

    let dateRangeStr = '';
    let entries = [];
    let totals = {};

    if (report_type === 'DAILY') {
      const targetDate = date || new Date().toISOString().split('T')[0];
      dateRangeStr = targetDate;
      entries = queryAll(`
        SELECT wre.* 
        FROM work_report_entries wre
        JOIN work_reports wr ON wre.report_id = wr.id
        WHERE wr.employee_id = ? AND wre.entry_date = ?
      `, [targetEmployeeId, targetDate]);

      const tasks = queryAll(`
        SELECT * FROM tasks WHERE assigned_to = ? AND task_date = ? AND is_deleted = 0
      `, [targetEmployeeId, targetDate]);

      let totalQty = entries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
      totals = {
        totalQuantity: totalQty,
        totalTasks: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED').length,
        pending: tasks.filter(t => t.status === 'PENDING').length
      };

    } else if (report_type === 'WEEKLY') {
      const sDate = start_date || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const eDate = end_date || new Date().toISOString().split('T')[0];
      dateRangeStr = `${sDate} to ${eDate}`;

      entries = queryAll(`
        SELECT wre.* 
        FROM work_report_entries wre
        JOIN work_reports wr ON wre.report_id = wr.id
        WHERE wr.employee_id = ? AND wre.entry_date BETWEEN ? AND ?
        ORDER BY wre.entry_date ASC
      `, [targetEmployeeId, sDate, eDate]);

      const tasks = queryAll(`
        SELECT * FROM tasks WHERE assigned_to = ? AND task_date BETWEEN ? AND ? AND is_deleted = 0
      `, [targetEmployeeId, sDate, eDate]);

      let totalQty = entries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
      totals = {
        totalQuantity: totalQty,
        totalTasks: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED').length,
        pending: tasks.filter(t => t.status === 'PENDING').length
      };

    } else if (report_type === 'MONTHLY') {
      const mStr = month || new Date().toISOString().substring(0, 7);
      dateRangeStr = `Month of ${mStr}`;

      entries = queryAll(`
        SELECT wre.* 
        FROM work_report_entries wre
        JOIN work_reports wr ON wre.report_id = wr.id
        WHERE wr.employee_id = ? AND wre.entry_date LIKE ?
        ORDER BY wre.entry_date DESC
      `, [targetEmployeeId, `${mStr}%`]);

      const tasks = queryAll(`
        SELECT * FROM tasks WHERE assigned_to = ? AND task_date LIKE ? AND is_deleted = 0
      `, [targetEmployeeId, `${mStr}%`]);

      let totalQty = entries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
      totals = {
        totalQuantity: totalQty,
        totalTasks: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED').length,
        pending: tasks.filter(t => t.status === 'PENDING').length
      };
    }

    const rows = entries.map(e => ({
      date: e.entry_date,
      work_type_name: e.work_type_name,
      client_or_task: e.client_name ? `${e.client_name} - ${e.task_title || ''}` : (e.task_title || '—'),
      status: e.status || 'Done',
      quantity: e.quantity,
      description: e.description
    }));

    const buffer = generateExcelBuffer({
      companyName: company?.company_name || 'IT Operations',
      employeeName: employee?.full_name || 'Employee',
      employeeId: employee?.employee_id || 'EMP-001',
      reportType: report_type.toUpperCase(),
      dateRangeStr,
      rows,
      totals
    });

    const safeEmpName = (employee?.full_name || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${report_type}_Report_${safeEmpName}_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Export Excel error:', err);
    return res.status(500).json({ error: 'Failed to generate Excel report: ' + err.message });
  }
});

// POST /api/work-reports/send-email (Direct Send of Excel Report by Email)
router.post('/send-email', authenticate, async (req, res) => {
  try {
    const isEmployee = req.user.role === 'EMPLOYEE';
    let targetEmployeeId = req.user.id;

    if (!isEmployee && req.body.employee_id) {
      targetEmployeeId = Number(req.body.employee_id);
    } else if (isEmployee && req.body.employee_id && Number(req.body.employee_id) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const {
      recipient_email,
      subject,
      message = '',
      report_type = 'DAILY',
      date,
      start_date,
      end_date,
      month
    } = req.body;

    if (!recipient_email || !recipient_email.trim()) {
      return res.status(400).json({ error: 'Recipient email address is required.' });
    }

    const company = queryGet('SELECT * FROM company_settings WHERE id = 1');
    if (!company || !company.smtp_host || !company.smtp_user) {
      return res.status(400).json({
        error: 'Email service is not yet configured. Please configure SMTP settings in Settings -> Email Configuration before sending reports.'
      });
    }

    const employee = queryGet('SELECT full_name, employee_id FROM users WHERE id = ?', [targetEmployeeId]);

    // Build Excel buffer
    let dateRangeStr = '';
    let entries = [];
    let totals = {};

    if (report_type === 'DAILY') {
      const targetDate = date || new Date().toISOString().split('T')[0];
      dateRangeStr = targetDate;
      entries = queryAll(`
        SELECT wre.* 
        FROM work_report_entries wre
        JOIN work_reports wr ON wre.report_id = wr.id
        WHERE wr.employee_id = ? AND wre.entry_date = ?
      `, [targetEmployeeId, targetDate]);

      let totalQty = entries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
      totals = { totalQuantity: totalQty };
    } else if (report_type === 'WEEKLY') {
      const sDate = start_date || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const eDate = end_date || new Date().toISOString().split('T')[0];
      dateRangeStr = `${sDate} to ${eDate}`;
      entries = queryAll(`
        SELECT wre.* 
        FROM work_report_entries wre
        JOIN work_reports wr ON wre.report_id = wr.id
        WHERE wr.employee_id = ? AND wre.entry_date BETWEEN ? AND ?
      `, [targetEmployeeId, sDate, eDate]);

      let totalQty = entries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
      totals = { totalQuantity: totalQty };
    } else {
      const mStr = month || new Date().toISOString().substring(0, 7);
      dateRangeStr = `Month of ${mStr}`;
      entries = queryAll(`
        SELECT wre.* 
        FROM work_report_entries wre
        JOIN work_reports wr ON wre.report_id = wr.id
        WHERE wr.employee_id = ? AND wre.entry_date LIKE ?
      `, [targetEmployeeId, `${mStr}%`]);

      let totalQty = entries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
      totals = { totalQuantity: totalQty };
    }

    const rows = entries.map(e => ({
      date: e.entry_date,
      work_type_name: e.work_type_name,
      client_or_task: e.client_name ? `${e.client_name} - ${e.task_title || ''}` : (e.task_title || '—'),
      status: e.status || 'Done',
      quantity: e.quantity,
      description: e.description
    }));

    const buffer = generateExcelBuffer({
      companyName: company.company_name || 'IT Operations',
      employeeName: employee?.full_name || 'Employee',
      employeeId: employee?.employee_id || 'EMP-001',
      reportType: report_type.toUpperCase(),
      dateRangeStr,
      rows,
      totals
    });

    const safeEmpName = (employee?.full_name || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${report_type}_Report_${safeEmpName}_${dateRangeStr.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

    const transporter = nodemailer.createTransport({
      host: company.smtp_host,
      port: Number(company.smtp_port) || 587,
      secure: Boolean(company.smtp_secure),
      auth: {
        user: company.smtp_user,
        pass: company.smtp_pass || ''
      }
    });

    const mailSubject = subject || `${report_type} Work Report - ${employee?.full_name} (${dateRangeStr})`;
    const mailBody = message || `Please find attached the ${report_type} Work & Performance Report for ${employee?.full_name} (${employee?.employee_id}) for ${dateRangeStr}.\n\nTotal Work Units: ${totals.totalQuantity || 0}\n\nGenerated automatically via ${company.company_name || 'IT Task Tracker'}.`;

    await transporter.sendMail({
      from: `"${company.smtp_from_name || company.company_name || 'IT Task Tracker'}" <${company.smtp_from_email || company.smtp_user}>`,
      to: recipient_email.trim(),
      subject: mailSubject,
      text: mailBody,
      attachments: [
        {
          filename,
          content: buffer
        }
      ]
    });

    // Log to report_logs
    queryRun(`
      INSERT INTO report_logs (user_id, report_type, recipient_email, subject, message, file_name, status)
      VALUES (?, ?, ?, ?, ?, ?, 'SENT')
    `, [req.user.id, report_type, recipient_email.trim(), mailSubject, message, filename]);

    logAdminActivity(req.user.id, 'REPORT_SENT', `Sent ${report_type} Excel report to ${recipient_email.trim()}`);

    return res.json({
      message: 'Report Sent Successfully',
      recipient: recipient_email.trim(),
      filename
    });
  } catch (err) {
    console.error('Send report email error:', err);
    return res.status(500).json({
      error: 'Failed to send email: ' + (err.message || 'Check your SMTP configuration.')
    });
  }
});

module.exports = router;
