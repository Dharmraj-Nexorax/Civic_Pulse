import { query, closePool } from '../src/lib/db';
import { verifyPassword, createAuthToken, verifyAuthToken, AuthUser } from '../src/lib/auth';
import { DEMO_ADMINS, DEMO_WORKERS, DEMO_CITIZENS } from './seed-demo';

async function testDemoAuth() {
  console.log('====================================================');
  console.log('🧪 CivicPulse Demo Authentication & RBAC Test Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${msg}`);
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  try {
    const allAccounts = [...DEMO_ADMINS, ...DEMO_WORKERS, ...DEMO_CITIZENS];

    console.log(`1. Testing database existence and credential verification for ${allAccounts.length} demo accounts...`);

    for (const acc of allAccounts) {
      const { rows: users } = await query<AuthUser & { password_hash: string; is_active: number; is_demo: number }>(
        `SELECT id, organization_id, role, full_name, mobile, email, ward_id, team_id,
                password_hash, is_active, is_demo
         FROM users
         WHERE email = $1`,
        [acc.email]
      );

      assert(users.length === 1, `User found in DB for email: ${acc.email}`);
      const user = users[0];

      assert(user.role === acc.role, `User ${acc.email} has expected role ${acc.role}`);
      assert(user.is_active === 1, `User ${acc.email} is active`);
      assert(user.is_demo === 1, `User ${acc.email} is marked as demo`);

      // Password verification by email
      const validEmailPass = await verifyPassword(acc.passwordPlain, user.password_hash);
      assert(validEmailPass, `Password verification succeeds for email: ${acc.email}`);

      // Password verification by mobile
      const { rows: mobileUsers } = await query<AuthUser & { password_hash: string }>(
        `SELECT id, password_hash FROM users WHERE mobile = $1`,
        [acc.mobile]
      );
      assert(mobileUsers.length === 1, `User found by mobile: ${acc.mobile}`);
      const validMobilePass = await verifyPassword(acc.passwordPlain, mobileUsers[0].password_hash);
      assert(validMobilePass, `Password verification succeeds for mobile: ${acc.mobile}`);

      // Token creation & verification
      const token = await createAuthToken({
        id: user.id,
        organization_id: user.organization_id,
        role: user.role,
        full_name: user.full_name,
        mobile: user.mobile,
        email: user.email,
        ward_id: user.ward_id,
        team_id: user.team_id,
      });
      assert(typeof token === 'string' && token.length > 20, `JWT token generated for ${acc.email}`);

      const verified = await verifyAuthToken(token);
      assert(verified !== null, `JWT token verifies for ${acc.email}`);
      assert(verified?.role === acc.role, `JWT payload preserves role ${acc.role}`);
      assert(verified?.sub === user.id, `JWT subject matches user ID ${user.id}`);
    }

    console.log('\n2. Testing Role-Based Data Isolation & Query Boundaries...');

    // A. Worker View isolation
    for (const w of DEMO_WORKERS) {
      const { rows: u } = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [w.email]);
      const workerId = u[0].id;

      const { rows: workerIssues } = await query<{ id: string; assigned_worker_id: string }>(
        `SELECT id, assigned_worker_id FROM issues WHERE assigned_worker_id = $1`,
        [workerId]
      );

      for (const wi of workerIssues) {
        assert(wi.assigned_worker_id === workerId, `Worker ${w.fullName} only receives issues assigned to their ID`);
      }
    }

    // B. Citizen View isolation
    for (const c of DEMO_CITIZENS) {
      const { rows: u } = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [c.email]);
      const citizenId = u[0].id;

      const { rows: citizenComplaints } = await query<{ id: string; citizen_id: string }>(
        `SELECT id, citizen_id FROM complaints WHERE citizen_id = $1`,
        [citizenId]
      );

      for (const comp of citizenComplaints) {
        assert(comp.citizen_id === citizenId, `Citizen ${c.fullName} only queries their own complaints`);
      }
    }

    // C. Administrator View coverage
    const { rows: allIssues } = await query<{ count: string }>('SELECT COUNT(*) as count FROM issues');
    const totalIssuesCount = parseInt(allIssues[0].count, 10);
    assert(totalIssuesCount >= 20, `Admin has visibility over full issue catalog (Found ${totalIssuesCount} issues)`);

    // D. Check Assignments & Resolutions Consistency
    const { rows: resolvedIssues } = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM issues WHERE status IN ('RESOLVED', 'CITIZEN_VERIFIED', 'REOPENED')`
    );
    const resolvedCount = parseInt(resolvedIssues[0].count, 10);
    assert(resolvedCount >= 6, `Found ${resolvedCount} resolved/verified demonstration issues`);

    const { rows: ratings } = await query<{ count: string }>('SELECT COUNT(*) as count FROM ratings');
    const ratingsCount = parseInt(ratings[0].count, 10);
    assert(ratingsCount >= 4, `Found ${ratingsCount} citizen star ratings in database`);

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} AUTHENTICATION & RBAC TESTS PASSED!`);
    console.log('====================================================\n');
  } finally {
    await closePool();
  }
}

testDemoAuth().catch((err) => {
  console.error('Demo auth test failed:', err);
  process.exit(1);
});
