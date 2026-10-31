const express = require('express');
const router = express.Router();
const { queryAll, queryGet, queryRun, generateNextTaskId, createNotification } = require('../db');
const { authenticate, requireRole, logAdminActivity } = require('../auth');

function formatTimeOnly(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return isoString;
  }
}

// GET /api/tasks (Super Admin gets all with filters; Employee strictly filtered to assigned_to = req.user.id)
router.get('/', authenticate, (req, res) => {
  try {
    const {
      status,
      priority,
      date,
      datePreset,
      work_type,
      work_category,
      assignedTo,
      client,
      clientId,
      search,
      sort = 'deadline_asc'
    } = req.query;

    let sql = `
      SELECT 
        t.*,
        u_assignee.full_name as assignee_name,
        u_assignee.username as assignee_username,
        u_assignee.employee_id as assignee_employee_id,
        u_assignee.designation as assignee_designation,
        u_assignee.avatar_color as assignee_avatar_color,
        u_creator.full_name as creator_name,
        (SELECT COUNT(*) FROM task_updates WHERE task_id = t.id) as updates_count,
        (SELECT created_at FROM task_updates WHERE task_id = t.id ORDER BY id DESC LIMIT 1) as last_update_at,
        (SELECT work_update FROM task_updates WHERE task_id = t.id ORDER BY id DESC LIMIT 1) as last_work_update
      FROM tasks t
      LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      WHERE t.is_deleted = 0
    `;
    const params = [];

    // CRITICAL SECURITY: Employee can ONLY view tasks assigned to them
    if (req.user.role === 'EMPLOYEE') {
      sql += ` AND t.assigned_to = ?`;
      params.push(req.user.id);
    } else if (assignedTo && assignedTo !== 'ALL') {
      sql += ` AND t.assigned_to = ?`;
      params.push(Number(assignedTo));
    }

    // Client filtering
    if (clientId && clientId !== 'ALL') {
      sql += ` AND t.client_id = ?`;
      params.push(Number(clientId));
    } else if (client && client !== 'ALL') {
      sql += ` AND LOWER(t.client_name) = ?`;
      params.push(client.toLowerCase().trim());
    }

    // Work type & category
    if (work_type && work_type !== 'ALL') {
      sql += ` AND t.work_type = ?`;
      params.push(work_type);
    }
    if (work_category && work_category !== 'ALL') {
      sql += ` AND t.work_category = ?`;
      params.push(work_category);
    }

    // Date filtering
    const today = new Date().toISOString().split('T')[0];
    if (datePreset === 'today') {
      sql += ` AND t.task_date = ?`;
      params.push(today);
    } else if (datePreset === 'overdue') {
      sql += ` AND t.status != 'COMPLETED' AND t.deadline < ?`;
      params.push(new Date().toISOString());
    } else if (date && date !== 'ALL') {
      sql += ` AND t.task_date = ?`;
      params.push(date);
    }

    // Status filtering
    if (status && status !== 'ALL' && status !== 'AHEAD_OF_SCHEDULE') {
      sql += ` AND t.status = ?`;
      params.push(status);
    }

    // Priority filtering
    if (priority && priority !== 'ALL') {
      sql += ` AND t.priority = ?`;
      params.push(priority);
    }

    // Search query
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (
        LOWER(t.title) LIKE ? OR
        LOWER(t.task_id) LIKE ? OR
        LOWER(t.client_name) LIKE ? OR
        LOWER(t.description) LIKE ? OR
        LOWER(u_assignee.full_name) LIKE ?
      )`;
      params.push(term, term, term, term, term);
    }

    // Sorting
    if (sort === 'deadline_asc') {
      sql += ` ORDER BY t.deadline ASC, t.id DESC`;
    } else if (sort === 'priority_desc') {
      sql += ` ORDER BY CASE t.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, t.deadline ASC`;
    } else if (sort === 'newest') {
      sql += ` ORDER BY t.id DESC`;
    } else {
      sql += ` ORDER BY t.task_date DESC, t.id DESC`;
    }

    const tasks = queryAll(sql, params);

    // Compute dynamic flags: overdue, eta_missed, and smart schedule_status
    const nowTs = Date.now();
    let enrichedTasks = tasks.map(t => {
      const isCompleted = t.status === 'COMPLETED';
      let isOverdue = false;
      let isEtaMissed = false;

      if (!isCompleted && t.deadline) {
        const dlDate = new Date(t.deadline);
        if (!isNaN(dlDate.getTime()) && dlDate.getTime() < nowTs) {
          isOverdue = true;
        }
      }

      if (!isCompleted && !isOverdue && t.expected_completion) {
        const etaDate = new Date(t.expected_completion);
        if (!isNaN(etaDate.getTime()) && etaDate.getTime() < nowTs) {
          isEtaMissed = true;
        }
      }

      // Smart Schedule Calculation (AHEAD_OF_SCHEDULE / BEHIND_SCHEDULE / ON_TRACK / null)
      let scheduleStatus = null;
      if (!isCompleted && (t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED')) {
        const startTs = t.start_time ? new Date(t.start_time).getTime() : (t.created_at ? new Date(t.created_at).getTime() : null);
        const deadlineTs = t.deadline ? new Date(t.deadline).getTime() : null;
        const etaTs = t.expected_completion ? new Date(t.expected_completion).getTime() : null;
        const progress = Number(t.progress) || 0;

        if (isOverdue) {
          scheduleStatus = 'BEHIND_SCHEDULE';
        } else if (startTs && deadlineTs && deadlineTs > startTs) {
          const totalDuration = deadlineTs - startTs;
          const elapsed = nowTs - startTs;

          if (elapsed > 0) {
            const expectedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
            const progressDelta = progress - expectedProgress;

            // Ahead of schedule: progress significantly higher (+15% with >= 30% progress),
            // OR ETA earlier than deadline with solid progress (>= 50%)
            if (progressDelta >= 15 && progress >= 30) {
              scheduleStatus = 'AHEAD_OF_SCHEDULE';
            } else if (etaTs && etaTs < deadlineTs && progress >= 50 && !isEtaMissed) {
              scheduleStatus = 'AHEAD_OF_SCHEDULE';
            } else if (etaTs && etaTs <= deadlineTs - (30 * 60 * 1000) && progressDelta >= 10 && progress >= 35) {
              scheduleStatus = 'AHEAD_OF_SCHEDULE';
            } else if (isEtaMissed || (progressDelta <= -20 && elapsed / totalDuration > 0.35)) {
              scheduleStatus = 'BEHIND_SCHEDULE';
            } else {
              scheduleStatus = 'ON_TRACK';
            }
          }
        } else if (etaTs && deadlineTs && !isOverdue) {
          if (etaTs <= deadlineTs - (45 * 60 * 1000) && progress >= 50) {
            scheduleStatus = 'AHEAD_OF_SCHEDULE';
          } else if (isEtaMissed) {
            scheduleStatus = 'BEHIND_SCHEDULE';
          }
        }
      }

      return {
        ...t,
        is_overdue: isOverdue,
        is_eta_missed: isEtaMissed,
        schedule_status: scheduleStatus
      };
    });

    if (status === 'AHEAD_OF_SCHEDULE') {
      enrichedTasks = enrichedTasks.filter(t => t.schedule_status === 'AHEAD_OF_SCHEDULE');
    }

    return res.json({ tasks: enrichedTasks });
  } catch (err) {
    console.error('Fetch tasks error:', err);
    return res.status(500).json({ error: 'Failed to retrieve tasks.' });
  }
});

// GET /api/tasks/stats
router.get('/stats', authenticate, (req, res) => {
  try {
    const isEmployee = req.user.role === 'EMPLOYEE';
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    let baseSql = `SELECT * FROM tasks WHERE task_date = ? AND is_deleted = 0`;
    const params = [targetDate];

    if (isEmployee) {
      baseSql += ` AND assigned_to = ?`;
      params.push(req.user.id);
    }

    const tasks = queryAll(baseSql, params);
    const nowTs = Date.now();

    let totalTasks = tasks.length;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let overdue = 0;
    let advanceWork = 0;
    let aheadOfSchedule = 0;
    let totalProgress = 0;

    tasks.forEach(t => {
      totalProgress += (t.progress || 0);
      if (t.work_category === 'ADVANCE') advanceWork++;

      if (t.status === 'COMPLETED') {
        completed++;
      } else {
        if (t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED') inProgress++;
        else if (t.status === 'PENDING') pending++;

        if (t.deadline && new Date(t.deadline).getTime() < nowTs) {
          overdue++;
        }
      }
    });

    const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
    const averageProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;

    return res.json({
      targetDate,
      totalTasks,
      completed,
      inProgress,
      pending,
      overdue,
      advanceWork,
      completionRate,
      averageProgress
    });
  } catch (err) {
    console.error('Task stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve task stats.' });
  }
});

// GET /api/tasks/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const task = queryGet(`
      SELECT 
        t.*,
        u_assignee.full_name as assignee_name,
        u_assignee.username as assignee_username,
        u_assignee.employee_id as assignee_employee_id,
        u_assignee.avatar_color as assignee_avatar_color,
        u_creator.full_name as creator_name
      FROM tasks t
      LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      WHERE t.id = ? AND t.is_deleted = 0
    `, [taskId]);

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Role security: Employee can only view their own assigned task
    if (req.user.role === 'EMPLOYEE' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You can only view your own tasks.' });
    }

    const updates = queryAll(`
      SELECT tu.*, u.full_name as author_name, u.avatar_color as author_avatar_color
      FROM task_updates tu
      LEFT JOIN users u ON tu.user_id = u.id
      WHERE tu.task_id = ?
      ORDER BY tu.id DESC
    `, [taskId]);

    const activities = queryAll(`
      SELECT ta.*, u.full_name as actor_name
      FROM task_activities ta
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = ?
      ORDER BY ta.id ASC
    `, [taskId]);

    return res.json({
      task,
      updates,
      activities
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve task details.' });
  }
});

// POST /api/tasks (Super Admin creates task - 6 Step Flow)
router.post('/', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const {
      client_id,
      client_name,
      title,
      description = '',
      instructions = '',
      assigned_to,
      priority = 'MEDIUM',
      work_type,
      work_category = 'NORMAL',
      task_date,
      start_time,
      deadline,
      expected_completion,
      additional_instructions,
      attachment_name,
      attachment_path
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task Title is required.' });
    }
    if (!assigned_to) {
      return res.status(400).json({ error: 'Please assign this task to an employee.' });
    }
    if (!task_date) {
      return res.status(400).json({ error: 'Task date is required.' });
    }

    // Resolve client
    let finalClientName = client_name?.trim() || '';
    let finalClientId = client_id ? Number(client_id) : null;

    if (finalClientId) {
      const clientRecord = queryGet('SELECT client_name FROM clients WHERE id = ?', [finalClientId]);
      if (clientRecord) finalClientName = clientRecord.client_name;
    }

    if (!finalClientName) {
      return res.status(400).json({ error: 'Client Name is mandatory for every task.' });
    }

    const assignee = queryGet('SELECT id, full_name, status, is_deleted FROM users WHERE id = ?', [assigned_to]);
    if (!assignee || assignee.is_deleted || assignee.status === 'INACTIVE') {
      return res.status(400).json({ error: 'Assigned employee is invalid or deactivated.' });
    }

    const generatedTaskId = generateNextTaskId();
    const finalWorkCategory = work_category === 'ADVANCE' ? 'ADVANCE' : 'NORMAL';
    const finalWorkType = work_type?.trim() || 'General';

    const insertRes = queryRun(`
      INSERT INTO tasks (
        task_id, client_id, client_name, title, description, instructions,
        work_type, work_category, assigned_to, created_by, priority, status,
        progress, task_date, start_time, deadline, expected_completion,
        additional_instructions, attachment_name, attachment_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?, ?, ?, ?, ?, ?)
    `, [
      generatedTaskId,
      finalClientId,
      finalClientName,
      title.trim(),
      description.trim(),
      instructions.trim(),
      finalWorkType,
      finalWorkCategory,
      assigned_to,
      req.user.id,
      priority,
      task_date,
      start_time || null,
      deadline || '',
      expected_completion || null,
      additional_instructions || null,
      attachment_name || null,
      attachment_path || null
    ]);

    const newTaskId = insertRes.lastInsertRowid;

    // Log activity
    queryRun(`
      INSERT INTO task_activities (task_id, user_id, action_type, description)
      VALUES (?, ?, 'CREATED', ?)
    `, [newTaskId, req.user.id, `Task created for "${finalClientName}" and assigned to ${assignee.full_name}`]);

    logAdminActivity(
      req.user.id,
      'TASK_CREATED',
      `Created task ${generatedTaskId} for "${finalClientName}": "${title.trim()}" assigned to ${assignee.full_name}`,
      newTaskId,
      assignee.id
    );

    // Notify employee
    const deadlineNotice = deadline ? ` Deadline: ${formatTimeOnly(deadline)}` : '';
    createNotification(
      assignee.id,
      'New Task Assigned',
      `You have been assigned: ${finalClientName} - ${title.trim()} (${priority} priority).${deadlineNotice}`,
      'TASK_ASSIGNED',
      newTaskId
    );

    const createdTask = queryGet('SELECT * FROM tasks WHERE id = ?', [newTaskId]);

    return res.status(201).json({
      message: 'Task created successfully!',
      id: newTaskId,
      taskId: newTaskId,
      task_id: generatedTaskId,
      client_name: finalClientName,
      work_category: finalWorkCategory,
      task: createdTask
    });
  } catch (err) {
    console.error('Create task error:', err);
    return res.status(500).json({ error: 'Failed to create task: ' + err.message });
  }
});

// PUT /api/tasks/:id (Super Admin edits or reassigns task)
router.put('/:id', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const existing = queryGet('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0', [taskId]);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const {
      client_id,
      client_name,
      title,
      description,
      instructions,
      assigned_to,
      priority,
      work_type,
      work_category,
      task_date,
      start_time,
      deadline,
      expected_completion
    } = req.body;

    const finalClient = client_name?.trim() || existing.client_name;
    const finalAssigneeId = assigned_to ? Number(assigned_to) : existing.assigned_to;
    const wasReassigned = finalAssigneeId !== existing.assigned_to;

    queryRun(`
      UPDATE tasks SET
        client_id = COALESCE(?, client_id),
        client_name = ?,
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        instructions = COALESCE(?, instructions),
        assigned_to = ?,
        priority = COALESCE(?, priority),
        work_type = COALESCE(?, work_type),
        work_category = COALESCE(?, work_category),
        task_date = COALESCE(?, task_date),
        start_time = COALESCE(?, start_time),
        deadline = COALESCE(?, deadline),
        expected_completion = COALESCE(?, expected_completion),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      client_id ? Number(client_id) : null,
      finalClient,
      title?.trim() || null,
      description?.trim() || null,
      instructions?.trim() || null,
      finalAssigneeId,
      priority || null,
      work_type || null,
      work_category || null,
      task_date || null,
      start_time || null,
      deadline || null,
      expected_completion || null,
      taskId
    ]);

    if (wasReassigned) {
      const newAssignee = queryGet('SELECT full_name FROM users WHERE id = ?', [finalAssigneeId]);
      queryRun(`
        INSERT INTO task_activities (task_id, user_id, action_type, description)
        VALUES (?, ?, 'REASSIGNED', ?)
      `, [taskId, req.user.id, `Task reassigned to ${newAssignee?.full_name || 'new employee'}`]);

      createNotification(
        finalAssigneeId,
        'Task Reassigned to You',
        `Task ${existing.task_id} (${finalClient} - ${existing.title}) has been assigned to you.`,
        'TASK_ASSIGNED',
        taskId
      );
    }

    logAdminActivity(req.user.id, 'TASK_UPDATED', `Updated task ${existing.task_id}: "${finalClient} - ${existing.title}"`, taskId);

    const updated = queryGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
    return res.json({
      message: 'Task updated successfully!',
      task: updated
    });
  } catch (err) {
    console.error('Update task error:', err);
    return res.status(500).json({ error: 'Failed to update task.' });
  }
});

// DELETE /api/tasks/:id (Super Admin deletes task)
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const existing = queryGet('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0', [taskId]);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    queryRun('UPDATE tasks SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [taskId]);
    logAdminActivity(req.user.id, 'TASK_DELETED', `Deleted task ${existing.task_id}: "${existing.client_name} - ${existing.title}"`, taskId);

    return res.json({ message: 'Task removed successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// PATCH /api/tasks/:id/status (Accept / Change Status)
router.patch('/:id/status', authenticate, (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const { status } = req.body;
    const task = queryGet('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0', [taskId]);

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (req.user.role === 'EMPLOYEE' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const validStatuses = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid task status.' });
    }

    queryRun('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, taskId]);
    queryRun(`
      INSERT INTO task_activities (task_id, user_id, action_type, description)
      VALUES (?, ?, 'STATUS_CHANGED', ?)
    `, [taskId, req.user.id, `Status changed to ${status} by ${req.user.full_name}`]);

    return res.json({ message: `Status updated to ${status}.`, status });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update status.' });
  }
});

// POST /api/tasks/:id/updates (Simple Employee Task Progress & Work Update Modal)
router.post('/:id/updates', authenticate, (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const { progress, expected_completion, work_update, status } = req.body;

    const task = queryGet('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0', [taskId]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (req.user.role === 'EMPLOYEE' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (!work_update || !work_update.trim()) {
      return res.status(400).json({ error: 'Work update message is required.' });
    }

    const progNum = Number(progress);
    if (isNaN(progNum) || progNum < 0 || progNum > 100) {
      return res.status(400).json({ error: 'Progress must be between 0 and 100.' });
    }

    // Determine status automatically if progressing
    let newStatus = status || task.status;
    if (progNum === 100) {
      newStatus = 'COMPLETED';
    } else if (progNum > 0 && newStatus === 'PENDING') {
      newStatus = 'IN_PROGRESS';
    }

    queryRun(`
      INSERT INTO task_updates (task_id, user_id, progress, expected_completion, work_update)
      VALUES (?, ?, ?, ?, ?)
    `, [taskId, req.user.id, progNum, expected_completion || null, work_update.trim()]);

    let updateSql = `
      UPDATE tasks SET
        progress = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
    `;
    const updateParams = [progNum, newStatus];

    if (expected_completion) {
      updateSql += `, expected_completion = ?`;
      updateParams.push(expected_completion);
    }
    if (newStatus === 'COMPLETED') {
      updateSql += `, completed_at = CURRENT_TIMESTAMP, completion_summary = ?`;
      updateParams.push(work_update.trim());
    }

    updateSql += ` WHERE id = ?`;
    updateParams.push(taskId);
    queryRun(updateSql, updateParams);

    queryRun(`
      INSERT INTO task_activities (task_id, user_id, action_type, description)
      VALUES (?, ?, 'PROGRESS_UPDATED', ?)
    `, [taskId, req.user.id, `Progress updated to ${progNum}%: "${work_update.trim()}"`]);

    return res.json({
      message: 'Work update saved successfully!',
      progress: progNum,
      status: newStatus
    });
  } catch (err) {
    console.error('Work update error:', err);
    return res.status(500).json({ error: 'Failed to record work update.' });
  }
});

// POST /api/tasks/:id/complete (Employee marks task completed)
router.post('/:id/complete', authenticate, (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const { completion_summary = 'Task completed successfully' } = req.body;

    const task = queryGet('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0', [taskId]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (req.user.role === 'EMPLOYEE' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    queryRun(`
      UPDATE tasks SET
        status = 'COMPLETED',
        progress = 100,
        completed_at = CURRENT_TIMESTAMP,
        completion_summary = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [completion_summary.trim(), taskId]);

    queryRun(`
      INSERT INTO task_updates (task_id, user_id, progress, work_update)
      VALUES (?, ?, 100, ?)
    `, [taskId, req.user.id, `Final Completion: ${completion_summary.trim()}`]);

    queryRun(`
      INSERT INTO task_activities (task_id, user_id, action_type, description)
      VALUES (?, ?, 'COMPLETED', ?)
    `, [taskId, req.user.id, `Task marked 100% completed: "${completion_summary.trim()}"`]);

    return res.json({ message: 'Task marked as completed successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to complete task.' });
  }
});

module.exports = router;
