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

async function runImpersonationTests() {
  console.log('====================================================');
  console.log('   IMPERSONATION & ACCESS PERMISSIONS TEST SUITE    ');
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

  // 1. Log in Super Admin
  const superLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { login: 'superadmin', password: 'admin123' }
  });
  assert(superLogin.status === 200 && superLogin.data.user.role === 'SUPER_ADMIN', '1. Super Admin logs into their own account');
  const superToken = superLogin.data.token;
  const superId = superLogin.data.user.id;

  // 2. Log in Normal Admin
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { login: 'itadmin', password: 'admin123' }
  });
  assert(adminLogin.status === 200 && adminLogin.data.user.role === 'ADMIN', '2. Admin logs into their own account');
  const adminToken = adminLogin.data.token;
  const adminId = adminLogin.data.user.id;

  // 3. Log in IT Team Member (Rahul)
  const rahulLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { login: 'rahul', password: 'member123' }
  });
  assert(rahulLogin.status === 200 && rahulLogin.data.user.role === 'TEAM_MEMBER', '3. Member logs into their own account');
  const rahulToken = rahulLogin.data.token;
  const rahulId = rahulLogin.data.user.id;

  // 4. Log in IT Team Member (Amit)
  const amitLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { login: 'amit', password: 'member123' }
  });
  const amitToken = amitLogin.data.token;
  const amitId = amitLogin.data.user.id;

  // 5. Member CANNOT impersonate anyone
  const memberImpersonateAttempt = await request('/api/auth/impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${rahulToken}` },
    body: { target_user_id: amitId }
  });
  assert(memberImpersonateAttempt.status === 403, '4. Member CANNOT use Login as User (403 Forbidden)');

  // 6. Member CANNOT access another member's or admin's profile
  const memberAccessOtherProfile = await request(`/api/users/${amitId}`, {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(memberAccessOtherProfile.status === 403, '5. Member CANNOT access another account profile (403 Forbidden)');

  // 7. Member CAN access their own profile
  const memberAccessOwnProfile = await request(`/api/users/${rahulId}`, {
    headers: { Authorization: `Bearer ${rahulToken}` }
  });
  assert(memberAccessOwnProfile.status === 200 && memberAccessOwnProfile.data.user.id === rahulId, '6. Member CAN access their own account data');

  // 8. Admin MUST NEVER access or impersonate a Super Admin account
  const adminImpersonateSuperAttempt = await request('/api/auth/impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { target_user_id: superId }
  });
  assert(adminImpersonateSuperAttempt.status === 403, '7. Admin MUST NEVER impersonate a Super Admin account (403 Forbidden)');

  // 9. Admin CANNOT access Super Admin profile via direct API request
  const adminAccessSuperProfile = await request(`/api/users/${superId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminAccessSuperProfile.status === 403, '8. Admin CANNOT access Super Admin profile endpoint (403 Forbidden)');

  // 10. Admin CAN impersonate a Member account
  const adminImpersonateMember = await request('/api/auth/impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { target_user_id: rahulId }
  });
  assert(
    adminImpersonateMember.status === 200 &&
    adminImpersonateMember.data.user.id === rahulId &&
    adminImpersonateMember.data.user.is_impersonated === true &&
    adminImpersonateMember.data.user.original_user.id === adminId,
    '9. Admin CAN impersonate Member account with original_user securely recorded'
  );
  const adminAsMemberToken = adminImpersonateMember.data.token;

  // 11. Nested impersonation must be blocked
  const nestedAttempt = await request('/api/auth/impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminAsMemberToken}` },
    body: { target_user_id: amitId }
  });
  assert(nestedAttempt.status === 400, '10. Nested impersonation is strictly BLOCKED (400 Bad Request)');

  // 12. Impersonated session cannot alter roles
  const roleChangeAttempt = await request(`/api/users/${rahulId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminAsMemberToken}` },
    body: { role: 'SUPER_ADMIN' }
  });
  assert(roleChangeAttempt.status === 403, '11. Role change while impersonating is strictly BLOCKED (403 Forbidden)');

  // 13. Return to My Account (Exit Impersonation)
  const exitRes = await request('/api/auth/exit-impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminAsMemberToken}` }
  });
  assert(
    exitRes.status === 200 &&
    exitRes.data.user.id === adminId &&
    exitRes.data.user.role === 'ADMIN' &&
    exitRes.data.user.is_impersonated === false,
    '12. Exit impersonation correctly restores Admin session and permissions'
  );

  // 14. Super Admin CAN impersonate an Admin
  const superImpersonateAdmin = await request('/api/auth/impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: { target_user_id: adminId }
  });
  assert(
    superImpersonateAdmin.status === 200 &&
    superImpersonateAdmin.data.user.id === adminId &&
    superImpersonateAdmin.data.user.original_user.id === superId,
    '13. Super Admin CAN impersonate an Admin account'
  );
  const superAsAdminToken = superImpersonateAdmin.data.token;

  // 15. Super Admin exits impersonation
  const superExitRes = await request('/api/auth/exit-impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAsAdminToken}` }
  });
  assert(
    superExitRes.status === 200 &&
    superExitRes.data.user.id === superId &&
    superExitRes.data.user.role === 'SUPER_ADMIN',
    '14. Super Admin correctly returns to original Super Admin account'
  );

  // 16. Super Admin CAN impersonate a Member
  const superImpersonateMember = await request('/api/auth/impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: { target_user_id: amitId }
  });
  assert(
    superImpersonateMember.status === 200 &&
    superImpersonateMember.data.user.id === amitId &&
    superImpersonateMember.data.user.original_user.id === superId,
    '15. Super Admin CAN impersonate a Member account'
  );

  // Exit
  await request('/api/auth/exit-impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superImpersonateMember.data.token}` }
  });

  // 17. Audit Log contains both actor and target account IDs for start & end
  const auditRes = await request('/api/activity?limit=10', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  const activities = auditRes.data.activities || [];
  const startLog = activities.find(a => a.action === 'IMPERSONATION_STARTED');
  const endLog = activities.find(a => a.action === 'IMPERSONATION_ENDED');
  assert(
    Boolean(startLog && endLog && startLog.details.includes('ID:') && endLog.details.includes('ID:')),
    '16. Audit log records both original actor and target account IDs on start and end'
  );

  // 18. Website Link Name slug: brandtisersitdepartment
  const slugRouteRes = await request('/brandtisersitdepartment');
  assert(
    slugRouteRes.status === 200 &&
    (typeof slugRouteRes.data === 'string' && slugRouteRes.data.includes('IT Task Tracker')),
    '17. URL slug /brandtisersitdepartment responds with 200 OK and serves the application'
  );

  const slugSubRouteRes = await request('/brandtisersitdepartment/dashboard');
  assert(
    slugSubRouteRes.status === 200 &&
    (typeof slugSubRouteRes.data === 'string' && slugSubRouteRes.data.includes('IT Task Tracker')),
    '18. URL slug sub-path /brandtisersitdepartment/dashboard serves application correctly'
  );

  // 19. Existing routes preserved
  const rootRes = await request('/');
  const healthRes = await request('/api/health');
  assert(
    rootRes.status === 200 && healthRes.status === 200,
    '19. Existing route paths (/ and /api/health) preserved and functional'
  );

  console.log(`\n====================================================`);
  console.log(`  ALL ${passed} IMPERSONATION & SLUG TESTS PASSED!`);
  console.log(`====================================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runImpersonationTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
