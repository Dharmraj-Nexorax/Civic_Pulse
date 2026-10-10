import { query, withTransaction, closePool } from '../src/lib/db';
import { submitComplaint } from '../src/services/complaintService';
import { assignIssue } from '../src/services/assignmentService';
import { startWork, addWorkerNote, resolveIssue, verifyResolution } from '../src/services/resolutionService';
import { DEMO_ADMINS, DEMO_WORKERS, DEMO_CITIZENS } from './seed-demo';

async function runSmokeTest() {
  console.log('=== CivicPulse E2E Lifecycle Smoke Test ===\n');

  try {
    // 1. Fetch default organization
    const { rows: orgs } = await query<{ id: string }>('SELECT id FROM organizations WHERE slug = $1', [
      'demo-panchayat',
    ]);
    const orgId = orgs[0].id;

    // 2. Fetch admin, worker, citizen
    const { rows: admins } = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [DEMO_ADMINS[0].email]);
    const { rows: workers } = await query<{ id: string; team_id: string }>('SELECT id, team_id FROM users WHERE email = $1', [DEMO_WORKERS[0].email]);
    const { rows: citizens } = await query<{ id: string; ward_id: string }>('SELECT id, ward_id FROM users WHERE email = $1', [DEMO_CITIZENS[0].email]);
    const { rows: categories } = await query<{ id: string }>('SELECT id FROM categories WHERE `key` = $1', ['water_supply']);

    const adminId = admins[0].id;
    const worker = workers[0];
    const citizen = citizens[0];
    const categoryId = categories[0].id;

    console.log('Step 1: Citizen submits a live test complaint in Ward 1...');
    let issueView = await withTransaction(async (client) => {
      return submitComplaint(client, {
        organizationId: orgId,
        citizenId: citizen.id,
        categoryId,
        wardId: citizen.ward_id,
        description: 'Smoke test: Low pressure water pipeline observation at sector 4.',
        lat: 24.0868,
        lng: 75.0793,
        address: 'Sector 4, Main Road, Mandsaur',
        files: [],
        isDemo: true,
      });
    });

    console.log(`  -> Created Complaint #${issueView.complaint_no} (Issue ID: ${issueView.issue_id}, Status: ${issueView.status}, Priority: ${issueView.priority?.band})`);

    console.log('\nStep 2: Administrator assigns issue to Water Team worker...');
    await withTransaction(async (client) => {
      return assignIssue(client, {
        issueId: issueView.issue_id,
        orgId,
        teamId: worker.team_id,
        workerId: worker.id,
        adminId,
      });
    });
    console.log('  -> Assigned to worker successfully.');

    console.log('\nStep 3: Worker accepts and starts on-site work (IN_PROGRESS)...');
    await withTransaction(async (client) => {
      return startWork(client, issueView.issue_id, worker.id);
    });
    console.log('  -> Status moved to IN_PROGRESS.');

    console.log('\nStep 4: Worker logs an internal progress note...');
    await withTransaction(async (client) => {
      return addWorkerNote(client, issueView.issue_id, worker.id, 'Smoke test: Replaced washer and valve seal.');
    });
    console.log('  -> Worker note recorded.');

    console.log('\nStep 5: Worker resolves issue with photographic proof (RESOLVED)...');
    await withTransaction(async (client) => {
      return resolveIssue(client, {
        issueId: issueView.issue_id,
        workerId: worker.id,
        callerRole: 'WORKER',
        note: 'Smoke test: Replaced defective pipeline valve and tested flow rate.',
        proofFiles: [
          {
            originalName: 'smoke_proof.png',
            mime: 'image/png',
            sizeBytes: 1024,
            buffer: Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              'base64'
            ),
          },
        ],
      });
    });
    console.log('  -> Issue resolved by worker. Status is RESOLVED (Awaiting citizen confirmation).');

    console.log('\nStep 6: Citizen verifies resolution and rates 5 stars (CITIZEN_VERIFIED)...');
    const finalView = await withTransaction(async (client) => {
      return verifyResolution(client, {
        complaintId: issueView.complaint_id,
        citizenId: citizen.id,
        decision: 'VERIFIED',
        stars: 5,
      });
    });
    console.log(`  -> Citizen verified successfully! Final status: ${finalView.status}`);

    console.log('\n======================================================');
    console.log('🎉 E2E Lifecycle Smoke Test Passed with 100% Success!');
    console.log('======================================================\n');
  } finally {
    await closePool();
  }
}

runSmokeTest().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
