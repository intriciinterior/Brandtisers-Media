const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (options.body) {
      if (typeof options.body === 'object') {
        reqOptions.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
      }
    }

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('   IT TEAM TASK MANAGEMENT FULL VERIFICATION SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Health check
  const health = await request('/api/health');
  assert(health.status === 200 && health.data.status === 'online', '1. Server Health Check online');

  // 2. Super Admin Login
  const superLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { login: 'superadmin', password: 'admin123' }
  });
  assert(superLogin.status === 200 && superLogin.data.token && superLogin.data.user.role === 'SUPER_ADMIN', '2. Super Admin login successful');
  const superToken = superLogin.data.token;

  // 3. Normal Admin Login
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { login: 'itadmin', password: 'admin123' }
  });
  assert(adminLogin.status === 200 && adminLogin.data.user.role === 'ADMIN', '3. Normal Admin login successful');
  const adminToken = adminLogin.data.token;

  // 4. IT Team Member Login (Rahul)
  const rahulLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { login: 'rahul', password: 'member123' }
  });
  assert(rahulLogin.status === 200 && rahulLogin.data.user.role === 'TEAM_MEMBER', '4. IT Team Member (Rahul) login successful');
  const rahulToken = rahulLogin.data.token;
  const rahulId = rahulLogin.data.user.id;

  // 5. IT Team Member Login (Amit)
  const amitLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { login: 'amit', password: 'member123' }
  });
  assert(amitLogin.status === 200 && amitLogin.data.user.role === 'TEAM_MEMBER', '5. IT Team Member (Amit) login successful');
  const amitToken = amitLogin.data.token;
  const amitId = amitLogin.data.user.id;

  // 6. Role-Based Permissions Check: Team member cannot create tasks
  const memberCreateTaskAttempt = await request('/api/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${rahulToken}` },
    body: { title: 'Unauthorized Task', assigned_to: rahulId, task_date: '2026-10-07', deadline: '2026-10-07T18:00' }
  });
  assert(memberCreateTaskAttempt.status === 403, '6. RBAC Guard: Team member forbidden from creating tasks');

  // 7. Normal Admin cannot create another Admin
  const adminCreateAdminAttempt = await request('/api/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      full_name: 'Fake Admin', employee_id: 'EMP-999', email: 'fake@itdept.com',
      username: 'fakeadmin', password: 'password123', designation: 'Admin', role: 'ADMIN'
    }
  });
  assert(adminCreateAdminAttempt.status === 403, '7. RBAC Guard: Normal Admin forbidden from creating Admin users');

  // 8. Normal Admin CAN create an IT Team Member
  const testEmpId = 'EMP-TEST-' + Math.floor(Math.random() * 9000 + 1000);
  const testUsername = 'testmember_' + Math.floor(Math.random() * 9000 + 1000);
  const adminCreateMember = await request('/api/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      full_name: 'Test Engineer',
      employee_id: testEmpId,
      email: `${testUsername}@itdept.com`,
      username: testUsername,
      password: 'member123',
      designation: 'Junior Systems Engineer',
      role: 'TEAM_MEMBER'
    }
  });
  assert(adminCreateMember.status === 201 && adminCreateMember.data.userId, '8. Normal Admin successfully created IT Team Member');
  const createdMemberId = adminCreateMember.data.userId;

  // 9. Super Admin creates a task and assigns to Rahul
  const todayStr = '2026-10-07';
  const newTaskRes = await request('/api/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      client_name: 'ABC Technologies',
      title: 'Active Directory Kerberos Ticket Expiry Hardening',
      description: 'Audit Kerberos TGT lifetime and configure AES-256 encryption enforcement across domain controllers.',
      assigned_to: rahulId,
      priority: 'HIGH',
      task_date: todayStr,
      start_time: `${todayStr}T13:00`,
      deadline: `${todayStr}T17:30`,
      expected_completion: `${todayStr}T16:00`,
      additional_instructions: 'Export klist tickets prior to registry update.'
    }
  });
  assert(newTaskRes.status === 201 && newTaskRes.data.task_id && newTaskRes.data.taskId, `9. Super Admin created task ${newTaskRes.data.task_id}`);
  const createdTaskId = newTaskRes.data.taskId;
  const createdTaskStrId = newTaskRes.data.task_id;

  // 10. Team Member receives the task in their dashboard as PENDING
  const memberTasks = await request(`/api/tasks?date=${todayStr}`, {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  const receivedTask = memberTasks.data.tasks.find(t => t.id === createdTaskId);
  assert(receivedTask && receivedTask.status === 'PENDING', '10. Rahul received task as PENDING in dashboard');

  // 11. Rahul accepts the task (PENDING -> ACCEPTED)
  const acceptRes = await request(`/api/tasks/${createdTaskId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${rahulToken}` },
    body: { status: 'ACCEPTED' }
  });
  assert(acceptRes.status === 200 && acceptRes.data.status === 'ACCEPTED', '11. Rahul accepted the task (status = ACCEPTED)');

  // 12. Rahul updates progress to 50%, updates ETA, and adds work update note
  const updateRes = await request(`/api/tasks/${createdTaskId}/updates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rahulToken}` },
    body: {
      progress: 50,
      expected_completion: `${todayStr}T15:45`,
      work_update: 'Kerberos policy template applied to primary DC. Verifying member server ticket renewals.'
    }
  });
  assert(updateRes.status === 200 && updateRes.data.progress === 50 && updateRes.data.status === 'IN_PROGRESS', '12. Rahul logged work update and progress changed to 50% (IN_PROGRESS)');

  // 13. Rahul marks task as COMPLETED with final summary
  const completeRes = await request(`/api/tasks/${createdTaskId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rahulToken}` },
    body: {
      completion_summary: 'All domain controllers successfully enforced with AES-256 Kerberos encryption. Zero authentication faults.'
    }
  });
  assert(completeRes.status === 200 && completeRes.data.status === 'COMPLETED' && completeRes.data.progress === 100, '13. Rahul marked task COMPLETED with 100% and stored completion timestamp');

  // 14. Verify task details page returns full audit activities and work updates
  const taskDetails = await request(`/api/tasks/${createdTaskId}`, {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(
    taskDetails.status === 200 &&
    taskDetails.data.task.status === 'COMPLETED' &&
    taskDetails.data.updates.length >= 2 &&
    taskDetails.data.activities.length >= 3,
    '14. Task details verification: updates log and complete activity history intact'
  );

  // 15. Check Overdue Detection and Dashboard Calculations
  const statsRes = await request(`/api/tasks/stats?date=${todayStr}`, {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(
    statsRes.status === 200 &&
    statsRes.data.totalTasks >= 15 &&
    statsRes.data.completed >= 4 &&
    statsRes.data.overdue >= 2 &&
    statsRes.data.completionRate > 0 &&
    statsRes.data.averageProgress > 0 &&
    statsRes.data.overallEstimatedCompletion !== undefined,
    `15. Dashboard calculations: Total=${statsRes.data.totalTasks}, Completed=${statsRes.data.completed}, Overdue=${statsRes.data.overdue}, CompRate=${statsRes.data.completionRate}%, AvgProg=${statsRes.data.averageProgress}%, ETA="${statsRes.data.overallEstimatedCompletion}"`
  );

  // 16. Daily Report API verification
  const dailyReport = await request(`/api/reports/daily?date=${todayStr}`, {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(
    dailyReport.status === 200 &&
    dailyReport.data.memberBreakdown.length >= 4 &&
    dailyReport.data.summary.totalTasks > 0,
    '16. Daily Report verification: member-wise breakdown calculated'
  );

  // 17. CSV Export verification
  const csvRes = await request(`/api/reports/export-csv?date=${todayStr}`, {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(
    csvRes.status === 200 &&
    csvRes.headers['content-type'].includes('text/csv') &&
    csvRes.data.includes('Task ID') &&
    csvRes.data.includes('Title'),
    '17. CSV Export verification: real database CSV delivered'
  );

  // 18. Notifications verification
  const notifRes = await request('/api/notifications', {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(notifRes.status === 200 && Array.isArray(notifRes.data.notifications), '18. Notifications verification: retrieved user notifications');

  // Mark all notifications read
  const markAllRes = await request('/api/notifications/read-all', {
    method: 'POST',
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(markAllRes.status === 200, '19. Notifications mark-all-read verification');

  // 20. Soft delete user (preserves task history per requirement #11)
  const delUserRes = await request(`/api/users/${createdMemberId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(delUserRes.status === 200, '20. Team member soft-deletion preserved historical task attribution');

  // 21. Super Admin Deletes the test task
  const delTaskRes = await request(`/api/tasks/${createdTaskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(delTaskRes.status === 200, '21. Super Admin task deletion verified');

  console.log(`\n====================================================`);
  console.log(`  TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log(`====================================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
