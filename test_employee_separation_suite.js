/**
 * test_employee_separation_suite.js
 * Verification suite for:
 * 1. Strict Employee vs Admin Experience Separation
 * 2. Employee Morning Login & My Monthly Work Data
 * 3. Backend DB Permission Enforcement (403 on users, other employees, reports)
 * 4. Admin Daily Dashboard (Employee Work Breakdown)
 * 5. Admin Monthly Data Dashboard (KPIs & Employee-Wise Table)
 * 6. Advance Work Support & Badges
 * 7. Slug /brandtisersitdepartment Availability
 */

const BASE_URL = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== RUNNING EMPLOYEE SEPARATION & ENHANCEMENTS TEST SUITE ===\n');

  // 1. Authenticate users
  console.log('1. Authentication Verification:');
  const superAdminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: 'superadmin', password: 'admin123' })
  });
  assert(superAdminLogin.status === 200 && superAdminLogin.data.user.role === 'SUPER_ADMIN', 'Super Admin logs in successfully');
  const superAdminToken = superAdminLogin.data.token;

  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: 'itadmin', password: 'admin123' })
  });
  assert(adminLogin.status === 200 && adminLogin.data.user.role === 'ADMIN', 'Normal Admin logs in successfully');
  const adminToken = adminLogin.data.token;

  const rahulLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: 'rahul', password: 'member123' })
  });
  assert(rahulLogin.status === 200 && rahulLogin.data.user.role === 'TEAM_MEMBER', 'Employee (Rahul) logs in successfully');
  const rahulToken = rahulLogin.data.token;
  const rahulId = rahulLogin.data.user.id;

  const amitLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: 'amit', password: 'member123' })
  });
  assert(amitLogin.status === 200 && amitLogin.data.user.role === 'TEAM_MEMBER', 'Employee (Amit) logs in successfully');
  const amitToken = amitLogin.data.token;
  const amitId = amitLogin.data.user.id;

  // 2. Strict Backend Security for Employee Account
  console.log('\n2. Strict Security: Employee Boundary Enforcement:');

  // 2a. Employee tries to list users
  const employeeGetUsers = await request('/users', {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(employeeGetUsers.status === 403, `Employee cannot view users directory (Status: ${employeeGetUsers.status})`);

  // 2b. Employee tries to view another employee profile
  const employeeGetOtherProfile = await request(`/users/${amitId}`, {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(employeeGetOtherProfile.status === 403, `Employee cannot view another employee profile (Status: ${employeeGetOtherProfile.status})`);

  // 2c. Employee views their own profile
  const employeeGetSelfProfile = await request(`/users/${rahulId}`, {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(employeeGetSelfProfile.status === 200 && employeeGetSelfProfile.data.user.id === rahulId, 'Employee can view their own profile');

  // 2d. Employee tries to view team-wide reports
  const employeeDailyReport = await request('/reports/daily', {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(employeeDailyReport.status === 403, `Employee blocked from team daily report (Status: ${employeeDailyReport.status})`);

  const employeeMonthlyReport = await request('/reports/monthly', {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(employeeMonthlyReport.status === 403, `Employee blocked from team monthly report (Status: ${employeeMonthlyReport.status})`);

  // 2e. Employee queries GET /api/tasks: backend forces assigned_to = self
  const employeeTasksQuery = await request('/tasks', {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(employeeTasksQuery.status === 200, 'Employee tasks query succeeds');
  const nonRahulTasks = employeeTasksQuery.data.tasks.filter(t => t.assigned_to !== rahulId);
  assert(nonRahulTasks.length === 0, `All returned tasks belong exclusively to Rahul (Non-Rahul count: ${nonRahulTasks.length})`);

  // 2f. Employee tries to query Amit's tasks via query param assignedTo
  const employeeTamperQuery = await request(`/tasks?assignedTo=${amitId}`, {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  const tamperedTasks = employeeTamperQuery.data.tasks.filter(t => t.assigned_to !== rahulId);
  assert(tamperedTasks.length === 0, 'Tampered assignedTo parameter is overridden by backend; no other employee tasks returned');

  // 3. Employee Dedicated Monthly Work History
  console.log('\n3. Employee Dedicated Monthly Work History:');
  const rahulMonthly = await request('/tasks/my-monthly?month=2026-10', {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(rahulMonthly.status === 200, 'Employee can fetch their own monthly work history');
  assert(rahulMonthly.data.summary.totalTasks > 0, `Employee monthly summary returned totalTasks: ${rahulMonthly.data.summary.totalTasks}`);
  assert(typeof rahulMonthly.data.summary.advanceWorkCompleted === 'number', `Advance work completed tracked: ${rahulMonthly.data.summary.advanceWorkCompleted}`);
  const allBelongToRahul = rahulMonthly.data.tasks.every(t => t.assigned_to === rahulId);
  assert(allBelongToRahul, 'All tasks in employee monthly work strictly belong to the logged-in employee');

  // 3b. Employee tries to access Amit's monthly work
  const employeeStealMonthly = await request(`/tasks/my-monthly?month=2026-10&employee_id=${amitId}`, {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(employeeStealMonthly.status === 403, `Employee cannot query another employee monthly history (Status: ${employeeStealMonthly.status})`);

  // 4. Admin Daily Dashboard & Employee Work Breakdown
  console.log('\n4. Admin Daily Operations & Employee Work Breakdown:');
  const adminDaily = await request('/reports/daily?date=2026-10-07', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminDaily.status === 200, 'Admin can access daily operations report');
  assert(Array.isArray(adminDaily.data.memberBreakdown), 'Admin receives memberBreakdown array');
  assert(adminDaily.data.memberBreakdown.length >= 4, `Member breakdown includes all active team members (count: ${adminDaily.data.memberBreakdown.length})`);

  const rahulBreakdown = adminDaily.data.memberBreakdown.find(m => m.id === rahulId);
  assert(rahulBreakdown !== undefined, 'Rahul is present in daily employee work breakdown');
  if (rahulBreakdown) {
    console.log(`    Rahul daily: ${rahulBreakdown.assigned} Assigned, ${rahulBreakdown.completed} Completed, ${rahulBreakdown.in_progress} In Progress, ${rahulBreakdown.pending} Pending`);
    assert(typeof rahulBreakdown.assigned === 'number', 'Daily assigned count is numeric');
    assert(typeof rahulBreakdown.completion_rate === 'number', 'Daily completion rate is calculated');
  }

  // 5. Admin Monthly Data Dashboard (Req 6 & 11)
  console.log('\n5. Admin Monthly Data Dashboard:');
  const adminMonthly = await request('/reports/monthly?month=2026-10', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminMonthly.status === 200, 'Admin can fetch monthly tracking report');
  assert(adminMonthly.data.totalEmployees >= 4, `Total Employees tracked: ${adminMonthly.data.totalEmployees}`);
  assert(adminMonthly.data.totalTeamTasks > 0, `Total Team Tasks tracked: ${adminMonthly.data.totalTeamTasks}`);
  assert(typeof adminMonthly.data.completedMonthly === 'number', `Completed tasks tracked: ${adminMonthly.data.completedMonthly}`);
  assert(typeof adminMonthly.data.inProgressMonthly === 'number', `In Progress tasks tracked: ${adminMonthly.data.inProgressMonthly}`);
  assert(typeof adminMonthly.data.pendingMonthly === 'number', `Pending tasks tracked: ${adminMonthly.data.pendingMonthly}`);
  assert(typeof adminMonthly.data.overdueMonthly === 'number', `Overdue tasks tracked: ${adminMonthly.data.overdueMonthly}`);
  assert(typeof adminMonthly.data.advanceCompletedMonthly === 'number', `Advance Completed tracked: ${adminMonthly.data.advanceCompletedMonthly}`);
  assert(typeof adminMonthly.data.overallCompletion === 'number', `Overall Completion % tracked: ${adminMonthly.data.overallCompletion}%`);

  // Verify employee-wise table data
  assert(Array.isArray(adminMonthly.data.employeeBreakdown), 'Employee-wise monthly table breakdown returned');
  const sampleEmployee = adminMonthly.data.employeeBreakdown[0];
  assert(sampleEmployee && sampleEmployee.name && sampleEmployee.assigned !== undefined && sampleEmployee.advance_completed !== undefined,
    `Employee-wise record contains required fields (e.g. ${sampleEmployee.name}: ${sampleEmployee.assigned} assigned, ${sampleEmployee.advance_completed} advance completed)`);

  // Verify monthly filters: employee filter
  const adminMonthlyFilteredEmp = await request(`/reports/monthly?month=2026-10&employee_id=${rahulId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminMonthlyFilteredEmp.status === 200, 'Admin can filter monthly report by employee');
  const allFilteredBelongToRahul = adminMonthlyFilteredEmp.data.tasks.every(t => t.assigned_to === rahulId);
  assert(allFilteredBelongToRahul, 'All filtered monthly tasks belong to Rahul');

  // 6. Advance Work Creation & Update Verification
  console.log('\n6. Advance Work Feature Verification:');
  const newAdvanceTask = await request('/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      client_name: 'Apex HealthTech',
      title: 'Automated Disaster Recovery Drill (Advance)',
      description: 'Scheduled advance recovery drill ahead of timeline',
      assigned_to: rahulId,
      priority: 'HIGH',
      work_type: 'ADVANCE',
      task_date: '2026-10-07',
      start_time: '2026-10-07T10:00:00',
      deadline: '2026-10-07T18:00:00',
      expected_completion: '2026-10-07T16:00:00'
    })
  });
  assert(newAdvanceTask.status === 201, 'Admin successfully created an ADVANCE work task');
  assert(newAdvanceTask.data.work_type === 'ADVANCE', 'Task stored with work_type = ADVANCE');

  // Complete the advance task and verify advance completed tracking
  const completeAdvance = await request(`/tasks/${newAdvanceTask.data.id}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rahulToken}` },
    body: JSON.stringify({
      completion_summary: 'Disaster recovery drill passed all tests.'
    })
  });
  assert(completeAdvance.status === 200, 'Employee completed advance task successfully');

  // Verify that my-monthly reflects the advance completed task
  const rahulMonthlyAfter = await request('/tasks/my-monthly?month=2026-10', {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(rahulMonthlyAfter.data.summary.advanceWorkCompleted >= 1, 'Advance work completed reflected in employee monthly summary');

  // 7. Impersonation Security ("Login as User")
  console.log('\n7. Impersonation ("Login as User") Security:');
  // Admin impersonates Rahul
  const adminImpersonateRahul = await request('/auth/impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ target_user_id: rahulId })
  });
  assert(adminImpersonateRahul.status === 200, 'Admin can impersonate Rahul');
  assert(adminImpersonateRahul.data.user.is_impersonated === true, 'Response marks user.is_impersonated = true');
  assert(adminImpersonateRahul.data.user.role === 'TEAM_MEMBER', 'Session adopts TEAM_MEMBER role');

  // Employee attempts to impersonate
  const employeeImpersonate = await request('/auth/impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${rahulToken}` },
    body: JSON.stringify({ target_user_id: amitId })
  });
  assert(employeeImpersonate.status === 403, 'Employee cannot impersonate another employee');

  // Admin attempts to impersonate Super Admin
  const adminImpersonateSuper = await request('/auth/impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ target_user_id: superAdminLogin.data.user.id })
  });
  assert(adminImpersonateSuper.status === 403, 'Admin cannot impersonate Super Admin');

  // 8. Application URL Slug Verification
  console.log('\n8. Slug /brandtisersitdepartment Access:');
  const slugRes = await fetch('http://localhost:5000/brandtisersitdepartment');
  assert(slugRes.status === 200, `Slug URL /brandtisersitdepartment returns 200 OK (Status: ${slugRes.status})`);
  const html = await slugRes.text();
  assert(html.includes('<div id="root">'), 'Slug HTML serves the Single Page Application index');

  console.log(`\n=== TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
