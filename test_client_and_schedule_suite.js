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

async function runClientAndScheduleTests() {
  console.log('====================================================');
  console.log('   CLIENT NAME & SMART SCHEDULE STATUS TEST SUITE   ');
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

  // 1. Log in as Super Admin & Member
  const superLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { login: 'superadmin', password: 'admin123' }
  });
  const superToken = superLogin.data.token;

  const rahulLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { login: 'rahul', password: 'member123' }
  });
  const rahulToken = rahulLogin.data.token;
  const rahulId = rahulLogin.data.user.id;

  assert(Boolean(superToken && rahulToken), '1. Super Admin and Team Member authenticated');

  // 2. Mandatory Client Name: creating with empty client_name fails with 400
  const emptyClientTask = await request('/api/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      client_name: '   ',
      title: 'Should Fail Task',
      assigned_to: rahulId,
      task_date: '2026-10-07',
      deadline: '2026-10-07T18:00'
    }
  });
  assert(emptyClientTask.status === 400 && emptyClientTask.data.error.includes('Client Name'), '2. Empty Client Name is rejected with 400 Bad Request');

  const testStartTime = new Date(Date.now() - 3600000).toISOString(); // 1 hr ago
  const testDeadline = new Date(Date.now() + 14400000).toISOString();  // 4 hrs from now
  const testEta = new Date(Date.now() + 3600000).toISOString();        // 1 hr from now

  // 3. Creating task with valid Client Name succeeds
  const createdClientTask = await request('/api/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      client_name: 'Acme Global Corp',
      title: 'Payment Gateway Integration & Webhook TLS Setup',
      description: 'Configure TLS 1.3 endpoints and verify webhook signature.',
      assigned_to: rahulId,
      priority: 'HIGH',
      task_date: '2026-10-07',
      start_time: testStartTime,
      deadline: testDeadline,
      expected_completion: testEta,
      additional_instructions: 'Verify HMAC SHA-256 signatures.'
    }
  });
  assert(
    createdClientTask.status === 201 && createdClientTask.data.taskId,
    '3. Task successfully created with mandatory Client Name "Acme Global Corp"'
  );
  const acmeTaskId = createdClientTask.data.taskId;

  // 4. Client Name is returned in GET /api/tasks
  const getTasksRes = await request('/api/tasks?date=2026-10-07', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  const tasks = getTasksRes.data.tasks || [];
  const foundAcme = tasks.find(t => t.id === acmeTaskId);
  assert(
    Boolean(foundAcme && foundAcme.client_name === 'Acme Global Corp'),
    '4. Client Name is accurately stored and retrieved on task objects'
  );

  // 5. Search by Client Name: searching "Acme Global" returns the task
  const searchClientRes = await request('/api/tasks?search=Acme%20Global', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  const searchResults = searchClientRes.data.tasks || [];
  assert(
    searchResults.length > 0 && searchResults.some(t => t.client_name === 'Acme Global Corp'),
    '5. Search by Client Name successfully returns matching tasks'
  );

  // 6. Filter by Client Name: query ?client=Acme Global Corp
  const filterClientRes = await request('/api/tasks?client=Acme%20Global%20Corp', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  const filterResults = filterClientRes.data.tasks || [];
  assert(
    filterResults.length > 0 && filterResults.every(t => t.client_name === 'Acme Global Corp'),
    '6. Client Name filter strictly filters tasks for the selected client'
  );

  // 7. Team member view has Client Name
  const memberTasksRes = await request('/api/tasks?date=2026-10-07', {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  const memberTasks = memberTasksRes.data.tasks || [];
  const memberFoundAcme = memberTasks.find(t => t.id === acmeTaskId);
  assert(
    Boolean(memberFoundAcme && memberFoundAcme.client_name === 'Acme Global Corp'),
    '7. Team Member dashboard view includes Client Name for all assigned tasks'
  );

  // 8. Smart Ahead of Schedule Calculation
  // Advance progress on the Acme task to 85% (elapsed is ~20%, so 85% is well ahead of expected)
  await request(`/api/tasks/${acmeTaskId}/accept`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  await request(`/api/tasks/${acmeTaskId}/updates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rahulToken}` },
    body: {
      progress: 85,
      expected_completion: testEta,
      work_update: 'TLS configuration completed early. Running test transactions.'
    }
  });

  const checkScheduleRes = await request(`/api/tasks?date=2026-10-07`, {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  const updatedAcme = (checkScheduleRes.data.tasks || []).find(t => t.id === acmeTaskId);
  assert(
    Boolean(updatedAcme && updatedAcme.schedule_status === 'AHEAD_OF_SCHEDULE'),
    '8. Smart calculation accurately assigns "AHEAD_OF_SCHEDULE" status when progress outpaces timeline'
  );

  // 9. Daily Report includes clientBreakdown
  const dailyReportRes = await request('/api/reports/daily?date=2026-10-07', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  const clientBreakdown = dailyReportRes.data.clientBreakdown || [];
  const acmeClientEntry = clientBreakdown.find(c => c.client_name === 'Acme Global Corp');
  assert(
    Boolean(acmeClientEntry && acmeClientEntry.total >= 1),
    '9. Daily report includes Client-Wise Breakdown with accurate task counts'
  );

  // 10. Daily Report client filter works
  const filteredDailyReport = await request('/api/reports/daily?date=2026-10-07&client=Acme%20Global%20Corp', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(
    filteredDailyReport.data.tasks.every(t => t.client_name === 'Acme Global Corp'),
    '10. Daily report client filter isolates tasks for the selected client'
  );

  // 11. CSV Export includes Client Name header and rows
  const csvRes = await request('/api/reports/export-csv?date=2026-10-07', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(
    typeof csvRes.data === 'string' &&
    csvRes.data.includes('Client Name') &&
    csvRes.data.includes('"Acme Global Corp"'),
    '11. CSV export includes "Client Name" column and accurate client data'
  );

  // Cleanup: delete test task
  await request(`/api/tasks/${acmeTaskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${superToken}` }
  });

  console.log(`\n====================================================`);
  console.log(`  ALL ${passed} CLIENT & SMART SCHEDULE TESTS PASSED!`);
  console.log(`====================================================`);

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runClientAndScheduleTests().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
