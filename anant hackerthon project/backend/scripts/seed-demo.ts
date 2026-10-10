import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query, closePool } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import { config } from '../src/lib/config';

// 1x1 transparent PNG sample for demo media files
const DEMO_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export interface DemoUserDef {
  id: string;
  role: 'ADMIN' | 'WORKER' | 'CITIZEN';
  fullName: string;
  mobile: string;
  email: string;
  passwordPlain: string;
  wardIndex?: number; // 0-7
  teamIndex?: number; // 0-3
  title?: string;
  specialization?: string;
}

export const DEMO_ADMINS: DemoUserDef[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    role: 'ADMIN',
    fullName: 'Rajesh Sharma',
    mobile: '9876543210',
    email: 'admin@civicpulse.org',
    passwordPlain: 'Admin@123456',
    title: 'Chief Municipal Officer (CMO)',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    role: 'ADMIN',
    fullName: 'Priya Verma',
    mobile: '9820011001',
    email: 'priya.ops@civicpulse.org',
    passwordPlain: 'OpsAdmin@2026',
    title: 'Municipal Operations Administrator',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    role: 'ADMIN',
    fullName: 'Vikramaditya Rao',
    mobile: '9820011002',
    email: 'vikram.officer@civicpulse.org',
    passwordPlain: 'Officer@2026',
    title: 'Grievance & Quality Officer',
  },
];

export const DEMO_WORKERS: DemoUserDef[] = [
  // Team 0: Water Team
  {
    id: 'w0000000-0000-0000-0000-000000000001',
    role: 'WORKER',
    fullName: 'Ramesh Kumar',
    mobile: '9830022001',
    email: 'ramesh.water@civicpulse.org',
    passwordPlain: 'WaterWorker@1',
    teamIndex: 0,
    specialization: 'Senior Water Pipeline Technician',
  },
  {
    id: 'w0000000-0000-0000-0000-000000000002',
    role: 'WORKER',
    fullName: 'Suresh Meena',
    mobile: '9830022002',
    email: 'suresh.water@civicpulse.org',
    passwordPlain: 'WaterWorker@2',
    teamIndex: 0,
    specialization: 'Water Meter & Valve Specialist',
  },
  // Team 1: Road Maintenance Team
  {
    id: 'w0000000-0000-0000-0000-000000000003',
    role: 'WORKER',
    fullName: 'Anil Patidar',
    mobile: '9830022003',
    email: 'anil.roads@civicpulse.org',
    passwordPlain: 'RoadWorker@1',
    teamIndex: 1,
    specialization: 'Asphalt & Pothole Lead',
  },
  {
    id: 'w0000000-0000-0000-0000-000000000004',
    role: 'WORKER',
    fullName: 'Dinesh Yadav',
    mobile: '9830022004',
    email: 'dinesh.roads@civicpulse.org',
    passwordPlain: 'RoadWorker@2',
    teamIndex: 1,
    specialization: 'Pavement & Drainage Mason',
  },
  // Team 2: Sanitation Team
  {
    id: 'w0000000-0000-0000-0000-000000000005',
    role: 'WORKER',
    fullName: 'Manoj Solanki',
    mobile: '9830022005',
    email: 'manoj.sanitation@civicpulse.org',
    passwordPlain: 'Sanitation@1',
    teamIndex: 2,
    specialization: 'Sanitation Supervisor',
  },
  {
    id: 'w0000000-0000-0000-0000-000000000006',
    role: 'WORKER',
    fullName: 'Kailash Gehlot',
    mobile: '9830022006',
    email: 'kailash.sanitation@civicpulse.org',
    passwordPlain: 'Sanitation@2',
    teamIndex: 2,
    specialization: 'Drain Clearance Technician',
  },
  // Team 3: Streetlight Team
  {
    id: 'w0000000-0000-0000-0000-000000000007',
    role: 'WORKER',
    fullName: 'Sunil Rathore',
    mobile: '9830022007',
    email: 'sunil.lighting@civicpulse.org',
    passwordPlain: 'Streetlight@1',
    teamIndex: 3,
    specialization: 'Senior Municipal Electrician',
  },
  {
    id: 'w0000000-0000-0000-0000-000000000008',
    role: 'WORKER',
    fullName: 'Deepak Chouhan',
    mobile: '9830022008',
    email: 'deepak.lighting@civicpulse.org',
    passwordPlain: 'Streetlight@2',
    teamIndex: 3,
    specialization: 'LED & Pole Field Technician',
  },
];

export const DEMO_CITIZENS: DemoUserDef[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    role: 'CITIZEN',
    fullName: 'Aarav Joshi',
    mobile: '9840033001',
    email: 'aarav.joshi@example.com',
    passwordPlain: 'Citizen@123',
    wardIndex: 0,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    role: 'CITIZEN',
    fullName: 'Ananya Sharma',
    mobile: '9840033002',
    email: 'ananya.sharma@example.com',
    passwordPlain: 'Citizen@123',
    wardIndex: 1,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    role: 'CITIZEN',
    fullName: 'Rohan Mehta',
    mobile: '9840033003',
    email: 'rohan.mehta@example.com',
    passwordPlain: 'Citizen@123',
    wardIndex: 2,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    role: 'CITIZEN',
    fullName: 'Pooja Gupta',
    mobile: '9840033004',
    email: 'pooja.gupta@example.com',
    passwordPlain: 'Citizen@123',
    wardIndex: 3,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000005',
    role: 'CITIZEN',
    fullName: 'Kavita Patel',
    mobile: '9840033005',
    email: 'kavita.patel@example.com',
    passwordPlain: 'Citizen@123',
    wardIndex: 4,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000006',
    role: 'CITIZEN',
    fullName: 'Siddharth Jain',
    mobile: '9840033006',
    email: 'siddharth.jain@example.com',
    passwordPlain: 'Citizen@123',
    wardIndex: 5,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000007',
    role: 'CITIZEN',
    fullName: 'Neha Trivedi',
    mobile: '9840033007',
    email: 'neha.trivedi@example.com',
    passwordPlain: 'Citizen@123',
    wardIndex: 6,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000008',
    role: 'CITIZEN',
    fullName: 'Amitabh Soni',
    mobile: '9840033008',
    email: 'amitabh.soni@example.com',
    passwordPlain: 'Citizen@123',
    wardIndex: 7,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000009',
    role: 'CITIZEN',
    fullName: 'Sunita Choudhary',
    mobile: '9840033009',
    email: 'sunita.c@example.com',
    passwordPlain: 'Citizen@123',
    wardIndex: 0,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000010',
    role: 'CITIZEN',
    fullName: 'Harish Tiwari',
    mobile: '9840033010',
    email: 'harish.tiwari@example.com',
    passwordPlain: 'Citizen@123',
    wardIndex: 1,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000011',
    role: 'CITIZEN',
    fullName: 'Meera Deshmukh',
    mobile: '9840033011',
    email: 'meera.d@example.com',
    passwordPlain: 'Citizen@123',
    wardIndex: 2,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000012',
    role: 'CITIZEN',
    fullName: 'Gopal Das',
    mobile: '9840033012',
    email: 'gopal.das@example.com',
    passwordPlain: 'Citizen@123',
    wardIndex: 3,
  },
];

async function upsertUser(
  orgId: string,
  user: DemoUserDef,
  wardId: string | null,
  teamId: string | null
): Promise<string> {
  const hash = await hashPassword(user.passwordPlain);

  const { rows: existingRows } = await query<{ id: string }>(
    `SELECT id FROM users
     WHERE organization_id = ? AND (
       (email IS NOT NULL AND email = ?) OR
       (mobile IS NOT NULL AND mobile = ?) OR
       id = ?
     )`,
    [orgId, user.email, user.mobile, user.id]
  );

  let actualId = user.id;
  if (existingRows.length > 0) {
    actualId = existingRows[0].id;
    await query(
      `UPDATE users
       SET role = ?,
           full_name = ?,
           mobile = ?,
           email = ?,
           password_hash = ?,
           ward_id = ?,
           team_id = ?,
           is_active = 1,
           is_demo = 1
       WHERE id = ?`,
      [user.role, user.fullName, user.mobile, user.email, hash, wardId, teamId, actualId]
    );
  } else {
    await query(
      `INSERT INTO users (
         id, organization_id, role, full_name, mobile, email, password_hash,
         ward_id, team_id, is_active, is_demo
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [actualId, orgId, user.role, user.fullName, user.mobile, user.email, hash, wardId, teamId]
    );
  }

  return actualId;
}

export async function seedDemo() {
  console.log('=== CivicPulse Complete Demo Dataset Seeding ===');

  try {
    // 1. Ensure base schema exists
    const baseSqlPath = path.resolve(process.cwd(), '../database/seeds/001_base.sql');
    if (fs.existsSync(baseSqlPath)) {
      const baseSql = fs.readFileSync(baseSqlPath, 'utf-8');
      await query(baseSql);
      console.log('✅ Base organization, teams, and categories verified.');
    }

    // Ensure uploads directory exists
    const uploadsDir = path.resolve(process.cwd(), config.uploadDir);
    const demoUploadsDir = path.join(uploadsDir, 'demo');
    fs.mkdirSync(demoUploadsDir, { recursive: true });

    const demoProofPath = path.join(demoUploadsDir, 'resolution_proof.png');
    fs.writeFileSync(demoProofPath, DEMO_PNG_BUFFER);

    // Fetch org
    const { rows: orgRows } = await query<{ id: string }>(
      'SELECT id FROM organizations WHERE slug = ?',
      [config.defaultOrgSlug]
    );
    if (orgRows.length === 0) {
      throw new Error(`Organization slug ${config.defaultOrgSlug} not found.`);
    }
    const orgId = orgRows[0].id;

    // Fetch wards
    let { rows: freshWards } = await query<{ id: string; name: string; center_lat: number; center_lng: number }>(
      'SELECT id, name, center_lat, center_lng FROM wards WHERE organization_id = ? ORDER BY name ASC',
      [orgId]
    );

    if (freshWards.length < 8) {
      console.log('Creating standard Wards 1..8...');
      const wardOffsets = [
        { name: 'Ward 1', dLat: 0.01, dLng: 0.01 },
        { name: 'Ward 2', dLat: 0.01, dLng: -0.01 },
        { name: 'Ward 3', dLat: -0.01, dLng: 0.01 },
        { name: 'Ward 4', dLat: -0.01, dLng: -0.01 },
        { name: 'Ward 5', dLat: 0.02, dLng: 0.0 },
        { name: 'Ward 6', dLat: -0.02, dLng: 0.0 },
        { name: 'Ward 7', dLat: 0.0, dLng: 0.02 },
        { name: 'Ward 8', dLat: 0.0, dLng: -0.02 },
      ];
      for (const w of wardOffsets) {
        const wardId = crypto.randomUUID();
        const wardLat = Number((config.seedCenterLat + w.dLat).toFixed(6));
        const wardLng = Number((config.seedCenterLng + w.dLng).toFixed(6));
        await query(
          `INSERT INTO wards (id, organization_id, name, center_lat, center_lng)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE center_lat = VALUES(center_lat), center_lng = VALUES(center_lng)`,
          [wardId, orgId, w.name, wardLat, wardLng]
        );
      }
      const updated = await query<{ id: string; name: string; center_lat: number; center_lng: number }>(
        'SELECT id, name, center_lat, center_lng FROM wards WHERE organization_id = ? ORDER BY name ASC',
        [orgId]
      );
      freshWards = updated.rows;
    }

    // Fetch teams
    const { rows: teamRows } = await query<{ id: string; name: string }>(
      'SELECT id, name FROM teams WHERE organization_id = ? ORDER BY id ASC',
      [orgId]
    );

    // Fetch categories
    const { rows: categoryRows } = await query<{ id: string; key: string; name: string; category_score: number }>(
      'SELECT id, `key`, name, category_score FROM categories WHERE organization_id = ?',
      [orgId]
    );
    const catMap = new Map(categoryRows.map((c) => [c.key, c]));

    const userIdMap = new Map<string, string>(); // email -> actual DB ID

    // 2. Seed Administrators
    console.log('\n--- Seeding Administrator Accounts ---');
    for (const admin of DEMO_ADMINS) {
      const actualId = await upsertUser(orgId, admin, null, null);
      userIdMap.set(admin.email, actualId);
      console.log(`  [ADMIN]   ${admin.fullName.padEnd(20)} | ${admin.email} / ${admin.mobile} | Pass: ${admin.passwordPlain}`);
    }

    // 3. Seed Workers
    console.log('\n--- Seeding Worker Accounts (across Departments/Teams) ---');
    for (const worker of DEMO_WORKERS) {
      const team = teamRows[worker.teamIndex! % teamRows.length];
      const actualId = await upsertUser(orgId, worker, null, team.id);
      userIdMap.set(worker.email, actualId);
      console.log(`  [WORKER]  ${worker.fullName.padEnd(16)} | Team: ${team.name.padEnd(22)} | ${worker.email} | Pass: ${worker.passwordPlain}`);
    }

    // 4. Seed Citizens
    console.log('\n--- Seeding Citizen Accounts (across Wards) ---');
    for (const citizen of DEMO_CITIZENS) {
      const ward = freshWards[citizen.wardIndex! % freshWards.length];
      const actualId = await upsertUser(orgId, citizen, ward.id, null);
      userIdMap.set(citizen.email, actualId);
      console.log(`  [CITIZEN] ${citizen.fullName.padEnd(18)} | Ward: ${ward.name.padEnd(8)} | ${citizen.email} | Pass: ${citizen.passwordPlain}`);
    }

    // 5. Seed Civic Complaints & Issues Scenarios
    console.log('\n--- Seeding Interconnected Demonstration Issues & Complaints ---');

    interface IssueSeedScenario {
      issueId: string;
      complaintId: string;
      status: 'REPORTED' | 'VERIFICATION' | 'GROUPED' | 'PRIORITIZED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CITIZEN_VERIFIED' | 'REOPENED';
      categoryKey: string;
      wardIndex: number;
      latOffset: number;
      lngOffset: number;
      citizenIndex: number;
      severity: 'MINOR' | 'SMALL_LOCAL' | 'SIGNIFICANT' | 'SERIOUS' | 'DANGEROUS';
      context: 'NORMAL' | 'SENSITIVE_LOCATION' | 'PUBLIC_FACILITY' | 'EMERGENCY' | 'PUBLIC_SAFETY';
      priorityScore: number;
      priorityBand: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      title: string;
      summary: string;
      description: string;
      address: string;
      workerIndex?: number;
      reopenedCount?: number;
      resolutionNote?: string;
      citizenDecision?: 'PENDING' | 'VERIFIED' | 'REJECTED';
      rejectReason?: string;
      ratingStars?: number;
      workerNote?: string;
      secondCitizenIndex?: number;
      secondDescription?: string;
    }

    const scenarios: IssueSeedScenario[] = [
      {
        issueId: 'i0000000-0000-0000-0000-000000000001',
        complaintId: 'c1000000-0000-0000-0000-000000000001',
        status: 'PRIORITIZED',
        categoryKey: 'water_supply',
        wardIndex: 0,
        latOffset: 0.002,
        lngOffset: 0.003,
        citizenIndex: 0, // Aarav Joshi
        severity: 'SERIOUS',
        context: 'PUBLIC_FACILITY',
        priorityScore: 68,
        priorityBand: 'HIGH',
        title: 'Major Main Pipeline Leakage near Gandhi Square',
        summary: 'Underground drinking water pipeline burst causing heavy surface flooding near Gandhi Square.',
        description: 'Potable water is gushing out on the main road for the last 6 hours. Water pressure in surrounding households has dropped completely.',
        address: 'Main Gandhi Chowk, near State Bank, Ward 1',
        secondCitizenIndex: 8, // Sunita Choudhary
        secondDescription: 'Water supply to our shops has completely stopped due to the pipeline burst.',
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000002',
        complaintId: 'c1000000-0000-0000-0000-000000000002',
        status: 'ASSIGNED',
        categoryKey: 'water_supply',
        wardIndex: 1,
        latOffset: -0.002,
        lngOffset: 0.002,
        citizenIndex: 1, // Ananya Sharma
        severity: 'SIGNIFICANT',
        context: 'NORMAL',
        priorityScore: 48,
        priorityBand: 'MEDIUM',
        title: 'Low Water Pressure and Broken Sluice Valve at Sharda Nagar',
        summary: 'Defective distribution valve resulting in zero water flow to lane 3.',
        description: 'The municipal supply valve is jammed and leaking into the gutter. Entire lane 3 did not receive morning water.',
        address: 'Lane 3, Sharda Nagar, Ward 2',
        workerIndex: 1, // Suresh Meena (Water)
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000003',
        complaintId: 'c1000000-0000-0000-0000-000000000003',
        status: 'IN_PROGRESS',
        categoryKey: 'water_supply',
        wardIndex: 2,
        latOffset: 0.001,
        lngOffset: -0.003,
        citizenIndex: 2, // Rohan Mehta
        severity: 'SERIOUS',
        context: 'PUBLIC_FACILITY',
        priorityScore: 72,
        priorityBand: 'HIGH',
        title: 'Continuous Water Leakage near Primary School Tap Connection',
        summary: 'Damaged riser pipe leaking directly onto the school entrance footpath.',
        description: 'School children are having trouble entering due to waterlogging from a broken public tap connection.',
        address: 'Government Primary School Road, Ward 3',
        workerIndex: 0, // Ramesh Kumar (Water)
        workerNote: 'Excavation completed. Replaced 2-meter cracked UPVC connector and installing new brass shutoff valve.',
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000004',
        complaintId: 'c1000000-0000-0000-0000-000000000004',
        status: 'RESOLVED',
        categoryKey: 'water_supply',
        wardIndex: 3,
        latOffset: -0.001,
        lngOffset: 0.001,
        citizenIndex: 3, // Pooja Gupta
        severity: 'SIGNIFICANT',
        context: 'NORMAL',
        priorityScore: 54,
        priorityBand: 'MEDIUM',
        title: 'Community Overhead Tank Float Valve Overflowing',
        summary: 'Overhead reservoir overflowing continuously for 3 hours.',
        description: 'Tank automatic float shutoff failed, causing wastage of hundreds of liters of drinking water.',
        address: 'Near Water Booster Station, Ward 4',
        workerIndex: 0, // Ramesh Kumar (Water)
        resolutionNote: 'Replaced malfunctioning heavy duty mechanical float valve and tested auto shut-off mechanism twice.',
        citizenDecision: 'PENDING',
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000005',
        complaintId: 'c1000000-0000-0000-0000-000000000005',
        status: 'CITIZEN_VERIFIED',
        categoryKey: 'water_supply',
        wardIndex: 4,
        latOffset: 0.003,
        lngOffset: 0.001,
        citizenIndex: 4, // Kavita Patel
        severity: 'SIGNIFICANT',
        context: 'NORMAL',
        priorityScore: 50,
        priorityBand: 'MEDIUM',
        title: 'Corroded GI Pipe Leak at Subhash Marg Market',
        summary: 'Old galvanized pipe replacement successfully completed in Subhash Marg.',
        description: 'Continuous seepage from old underground pipe was damaging pavement in the cloth market.',
        address: 'Subhash Marg Market, Ward 5',
        workerIndex: 1, // Suresh Meena
        resolutionNote: 'Replaced 4-meter corroded GI section with new UPVC pipe and restored street level.',
        citizenDecision: 'VERIFIED',
        ratingStars: 5,
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000006',
        complaintId: 'c1000000-0000-0000-0000-000000000006',
        status: 'REOPENED',
        categoryKey: 'water_supply',
        wardIndex: 5,
        latOffset: -0.003,
        lngOffset: -0.001,
        citizenIndex: 5, // Siddharth Jain
        severity: 'SERIOUS',
        context: 'NORMAL',
        priorityScore: 65,
        priorityBand: 'HIGH',
        title: 'Contaminated Muddy Tap Water Supply in Ward 6 Colony',
        summary: 'Tap water appearing turbid and muddy during morning supply hours.',
        description: 'Drinking water is contaminated with black silt. Previous flush did not solve the root issue.',
        address: 'Mahaveer Nagar, Ward 6',
        workerIndex: 0, // Ramesh Kumar
        reopenedCount: 1,
        resolutionNote: 'Flushed neighborhood distribution line.',
        citizenDecision: 'REJECTED',
        rejectReason: 'Water is still noticeably yellowish and smelling of silt during the 7 AM supply cycle.',
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000007',
        complaintId: 'c1000000-0000-0000-0000-000000000007',
        status: 'PRIORITIZED',
        categoryKey: 'road_damage',
        wardIndex: 6,
        latOffset: 0.001,
        lngOffset: 0.002,
        citizenIndex: 6, // Neha Trivedi
        severity: 'SERIOUS',
        context: 'PUBLIC_SAFETY',
        priorityScore: 78,
        priorityBand: 'HIGH',
        title: 'Dangerous Deep Potholes on Bus Stand Connecting Road',
        summary: 'Multiple deep potholes causing traffic disruption and risk to two-wheelers.',
        description: 'Large crater-like potholes near bus stand turn. Two motorcyclists slipped yesterday in the rain.',
        address: 'Bus Stand Link Road, Ward 7',
        secondCitizenIndex: 11, // Gopal Das
        secondDescription: 'The potholes are expanding daily; immediate gravel and bitumen filling required.',
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000008',
        complaintId: 'c1000000-0000-0000-0000-000000000008',
        status: 'ASSIGNED',
        categoryKey: 'road_damage',
        wardIndex: 7,
        latOffset: -0.002,
        lngOffset: -0.002,
        citizenIndex: 7, // Amitabh Soni
        severity: 'DANGEROUS',
        context: 'EMERGENCY',
        priorityScore: 86,
        priorityBand: 'CRITICAL',
        title: 'Caved-in Road Surface near Hospital Emergency Approach Gate',
        summary: 'Severe road cave-in blocking ambulance turning lane.',
        description: 'Road has sunk by 1.5 feet due to sewer seepage underneath. Emergency vehicles having severe difficulty.',
        address: 'District Civil Hospital North Gate Road, Ward 8',
        workerIndex: 2, // Anil Patidar (Roads)
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000009',
        complaintId: 'c1000000-0000-0000-0000-000000000009',
        status: 'IN_PROGRESS',
        categoryKey: 'road_damage',
        wardIndex: 0,
        latOffset: -0.001,
        lngOffset: 0.002,
        citizenIndex: 8, // Sunita Choudhary
        severity: 'SIGNIFICANT',
        context: 'NORMAL',
        priorityScore: 58,
        priorityBand: 'MEDIUM',
        title: 'Broken Road Edge and Unpaved Trench on Station Road',
        summary: 'Road widening trench left unfilled after utility work.',
        description: 'Trench dug for optical fiber was left open; road side is crumbling into the ditch.',
        address: 'Railway Station Road, Ward 1',
        workerIndex: 3, // Dinesh Yadav (Roads)
        workerNote: 'Ballast stone base packed and compacted with road roller. Applying wet mix macadam today.',
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000010',
        complaintId: 'c1000000-0000-0000-0000-000000000010',
        status: 'RESOLVED',
        categoryKey: 'road_damage',
        wardIndex: 1,
        latOffset: 0.002,
        lngOffset: -0.001,
        citizenIndex: 9, // Harish Tiwari
        severity: 'SMALL_LOCAL',
        context: 'PUBLIC_SAFETY',
        priorityScore: 48,
        priorityBand: 'MEDIUM',
        title: 'Damaged Concrete Speed Breaker with Exposed Steel Rebar',
        summary: 'Hazardous speed breaker repaired with cold bitumen.',
        description: 'Speed breaker broke in half and sharp iron rods were poking out causing tire punctures.',
        address: 'Near Old Bus Stand Junction, Ward 2',
        workerIndex: 2, // Anil Patidar (Roads)
        resolutionNote: 'Removed protruding rebar, reshaped speed breaker profile, and applied asphalt sealing with yellow reflective paint.',
        citizenDecision: 'PENDING',
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000011',
        complaintId: 'c1000000-0000-0000-0000-000000000011',
        status: 'CITIZEN_VERIFIED',
        categoryKey: 'road_damage',
        wardIndex: 2,
        latOffset: -0.002,
        lngOffset: 0.003,
        citizenIndex: 10, // Meera Deshmukh
        severity: 'SMALL_LOCAL',
        context: 'NORMAL',
        priorityScore: 38,
        priorityBand: 'MEDIUM',
        title: 'Pothole Patching on Old Grain Market Bypass',
        summary: 'Grain market bypass road potholes successfully filled.',
        description: 'Multiple potholes filled with asphalt near warehouse loading dock.',
        address: 'Krishi Upaj Mandi Bypass, Ward 3',
        workerIndex: 3, // Dinesh Yadav
        resolutionNote: 'Potholes excavated to square edges, primed, and filled with dense bitumen macadam.',
        citizenDecision: 'VERIFIED',
        ratingStars: 4,
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000012',
        complaintId: 'c1000000-0000-0000-0000-000000000012',
        status: 'PRIORITIZED',
        categoryKey: 'sanitation_sewage',
        wardIndex: 3,
        latOffset: 0.002,
        lngOffset: -0.002,
        citizenIndex: 11, // Gopal Das
        severity: 'DANGEROUS',
        context: 'PUBLIC_FACILITY',
        priorityScore: 76,
        priorityBand: 'HIGH',
        title: 'Severe Sewage Overflow near Community Health Dispensary',
        summary: 'Blocked sewer line backing up contaminated wastewater outside health center.',
        description: 'Drain is overflowing with foul black sewage. Patients cannot access the dispensary gate without stepping in wastewater.',
        address: 'Urban Health Post, Ward 4',
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000013',
        complaintId: 'c1000000-0000-0000-0000-000000000013',
        status: 'ASSIGNED',
        categoryKey: 'sanitation_sewage',
        wardIndex: 4,
        latOffset: -0.001,
        lngOffset: 0.002,
        citizenIndex: 4, // Kavita Patel
        severity: 'SIGNIFICANT',
        context: 'NORMAL',
        priorityScore: 52,
        priorityBand: 'MEDIUM',
        title: 'Blocked Stormwater Drain Choked with Plastic Waste',
        summary: 'Roadside stormwater drain clogged causing localized flooding.',
        description: 'Heavy blockage of polythene and silt in the roadside drain causing stagnant breeding pool for mosquitoes.',
        address: 'Panchvati Colony Main Lane, Ward 5',
        workerIndex: 5, // Kailash Gehlot (Sanitation)
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000014',
        complaintId: 'c1000000-0000-0000-0000-000000000014',
        status: 'IN_PROGRESS',
        categoryKey: 'sanitation_sewage',
        wardIndex: 5,
        latOffset: 0.001,
        lngOffset: -0.002,
        citizenIndex: 5, // Siddharth Jain
        severity: 'DANGEROUS',
        context: 'PUBLIC_SAFETY',
        priorityScore: 82,
        priorityBand: 'CRITICAL',
        title: 'Open Manhole Cover Missing on Residential Street',
        summary: 'Deep sewer manhole missing heavy lid creating fall hazard.',
        description: 'Cover was broken by a truck; open hole is 8 feet deep on an unlit road.',
        address: 'Shanti Nagar Cross Road, Ward 6',
        workerIndex: 4, // Manoj Solanki (Sanitation)
        workerNote: 'Red reflective danger cones and barricade installed immediately. Heavy ductile iron cover ordered for placement.',
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000015',
        complaintId: 'c1000000-0000-0000-0000-000000000015',
        status: 'CITIZEN_VERIFIED',
        categoryKey: 'sanitation_sewage',
        wardIndex: 6,
        latOffset: -0.003,
        lngOffset: 0.001,
        citizenIndex: 6, // Neha Trivedi
        severity: 'SMALL_LOCAL',
        context: 'NORMAL',
        priorityScore: 42,
        priorityBand: 'MEDIUM',
        title: 'Desilting of Stagnant Open Drain in Ward 7',
        summary: 'Drain cleared and sanitized with disinfectant.',
        description: 'Drain choked with leaves and sludge cleaned thoroughly.',
        address: 'Behind Girls College, Ward 7',
        workerIndex: 5, // Kailash Gehlot
        resolutionNote: 'Desilted 50 meters of open drain, removed silt bags to processing yard, and treated edges with lime powder.',
        citizenDecision: 'VERIFIED',
        ratingStars: 5,
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000016',
        complaintId: 'c1000000-0000-0000-0000-000000000016',
        status: 'PRIORITIZED',
        categoryKey: 'garbage_waste',
        wardIndex: 7,
        latOffset: 0.002,
        lngOffset: -0.001,
        citizenIndex: 7, // Amitabh Soni
        severity: 'SMALL_LOCAL',
        context: 'NORMAL',
        priorityScore: 40,
        priorityBand: 'MEDIUM',
        title: 'Illegal Garbage Dumping Corner creating Foul Odor',
        summary: 'Open vacant plot accumulating uncollected domestic waste.',
        description: 'People throwing garbage bags on empty corner plot for last 5 days. Stray cattle gathering.',
        address: 'Near Old Water Works boundary, Ward 8',
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000017',
        complaintId: 'c1000000-0000-0000-0000-000000000017',
        status: 'RESOLVED',
        categoryKey: 'garbage_waste',
        wardIndex: 0,
        latOffset: 0.001,
        lngOffset: 0.001,
        citizenIndex: 0, // Aarav Joshi
        severity: 'SIGNIFICANT',
        context: 'NORMAL',
        priorityScore: 46,
        priorityBand: 'MEDIUM',
        title: 'Uncollected Commercial Garbage Bin at Sabzi Mandi',
        summary: 'Large community bin cleared by mechanical loader.',
        description: 'Vegetable market dumpsters overflowing onto road causing traffic bottleneck.',
        address: 'Sabzi Mandi Yard, Ward 1',
        workerIndex: 4, // Manoj Solanki
        resolutionNote: 'Dispatched hydraulic tipper truck, cleared 2.5 tons of organic waste, and washed surrounding pavement.',
        citizenDecision: 'PENDING',
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000018',
        complaintId: 'c1000000-0000-0000-0000-000000000018',
        status: 'IN_PROGRESS',
        categoryKey: 'streetlight',
        wardIndex: 1,
        latOffset: -0.001,
        lngOffset: -0.002,
        citizenIndex: 1, // Ananya Sharma
        severity: 'SIGNIFICANT',
        context: 'PUBLIC_SAFETY',
        priorityScore: 62,
        priorityBand: 'HIGH',
        title: 'Cluster of 5 Streetlights Dark on Main Ring Road',
        summary: 'Feeder panel fault leaving 200m stretch of Ring Road in darkness.',
        description: 'Entire row of 5 LED streetlights has been off for two consecutive nights. Dangerous blind curve.',
        address: 'Bypass Ring Road Pole #42-46, Ward 2',
        workerIndex: 6, // Sunil Rathore (Streetlights)
        workerNote: 'Inspected feeder pillar box; discovered burnt contactor switch. Installing new 3-phase MCB and checking cable insulation.',
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000019',
        complaintId: 'c1000000-0000-0000-0000-000000000019',
        status: 'CITIZEN_VERIFIED',
        categoryKey: 'streetlight',
        wardIndex: 2,
        latOffset: 0.002,
        lngOffset: 0.002,
        citizenIndex: 2, // Rohan Mehta
        severity: 'SMALL_LOCAL',
        context: 'NORMAL',
        priorityScore: 35,
        priorityBand: 'MEDIUM',
        title: 'Flickering 72W LED Streetlight near Temple Crossing',
        summary: 'Defective LED fixture replaced.',
        description: 'Streetlight strobing intermittently making night commute disorienting.',
        address: 'Shiv Mandir Square, Ward 3',
        workerIndex: 7, // Deepak Chouhan
        resolutionNote: 'Replaced faulty internal LED driver unit and verified continuous illumination on load test.',
        citizenDecision: 'VERIFIED',
        ratingStars: 5,
      },
      {
        issueId: 'i0000000-0000-0000-0000-000000000020',
        complaintId: 'c1000000-0000-0000-0000-000000000020',
        status: 'ASSIGNED',
        categoryKey: 'public_safety',
        wardIndex: 3,
        latOffset: -0.002,
        lngOffset: 0.001,
        citizenIndex: 3, // Pooja Gupta
        severity: 'DANGEROUS',
        context: 'PUBLIC_SAFETY',
        priorityScore: 92,
        priorityBand: 'CRITICAL',
        title: 'Live Electrical Cable Hanging Low over Pedestrian Pathway',
        summary: 'Damaged overhead power line dangling at 6 feet height.',
        description: 'Sparking wire hanging down right beside grocery storefront. Imminent danger of electrocution.',
        address: 'Hanuman Chowk Pedestrian Walkway, Ward 4',
        workerIndex: 6, // Sunil Rathore
      },
    ];

    const adminDbId = userIdMap.get(DEMO_ADMINS[0].email)!;

    for (const sc of scenarios) {
      const ward = freshWards[sc.wardIndex % freshWards.length];
      const cat = catMap.get(sc.categoryKey) || categoryRows[0];
      const citizenDef = DEMO_CITIZENS[sc.citizenIndex % DEMO_CITIZENS.length];
      const citizenDbId = userIdMap.get(citizenDef.email)!;

      const workerDef = sc.workerIndex !== undefined ? DEMO_WORKERS[sc.workerIndex] : null;
      const workerDbId = workerDef ? userIdMap.get(workerDef.email)! : null;
      const team = workerDef ? teamRows[workerDef.teamIndex! % teamRows.length] : null;

      const issueLat = Number((ward.center_lat + sc.latOffset).toFixed(6));
      const issueLng = Number((ward.center_lng + sc.lngOffset).toFixed(6));

      const priorityBreakdown = {
        total: sc.priorityScore,
        band: sc.priorityBand,
        factors: [
          { key: 'severity', label: 'Severity', points: 25, max: 30, reason: 'Demonstration severity' },
          { key: 'affected', label: 'Affected citizens', points: sc.secondCitizenIndex ? 10 : 5, max: 25, reason: 'Reports count' },
          { key: 'category', label: 'Category', points: cat.category_score, max: 20, reason: cat.name },
          { key: 'context', label: 'Context', points: 10, max: 15, reason: sc.context },
          { key: 'time', label: 'Time pending', points: 5, max: 10, reason: 'Demonstration timeline' },
        ],
        severity_reviewed: true,
        override: null,
      };

      const isResolvedOrVerified = sc.status === 'RESOLVED' || sc.status === 'CITIZEN_VERIFIED' || sc.status === 'REOPENED';
      const isAssignedOrHigher = sc.status === 'ASSIGNED' || sc.status === 'IN_PROGRESS' || isResolvedOrVerified;

      // Upsert Issue
      await query(
        `INSERT INTO issues (
           id, organization_id, ward_id, category_id, status, title, summary, summary_source,
           lat, lng, primary_complaint_id, severity, severity_reviewed, context,
           priority_score, priority_band, priority_breakdown, verification_flags,
           assigned_team_id, assigned_worker_id, assigned_at, started_at, resolved_at, verified_at,
           reopened_count, is_demo, address, city, district, state, country, postal_code
         ) VALUES (
           ?, ?, ?, ?, ?, ?, ?, 'ai',
           ?, ?, ?, ?, 1, ?,
           ?, ?, ?, '[]',
           ?, ?, ?, ?, ?, ?,
           ?, 1, ?, 'Mandsaur', 'Mandsaur', 'Madhya Pradesh', 'India', '458001'
         )
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           title = VALUES(title),
           summary = VALUES(summary),
           priority_score = VALUES(priority_score),
           priority_band = VALUES(priority_band),
           priority_breakdown = VALUES(priority_breakdown),
           assigned_team_id = VALUES(assigned_team_id),
           assigned_worker_id = VALUES(assigned_worker_id),
           assigned_at = VALUES(assigned_at),
           started_at = VALUES(started_at),
           resolved_at = VALUES(resolved_at),
           verified_at = VALUES(verified_at),
           reopened_count = VALUES(reopened_count),
           is_demo = 1`,
        [
          sc.issueId,
          orgId,
          ward.id,
          cat.id,
          sc.status,
          sc.title,
          sc.summary,
          issueLat,
          issueLng,
          sc.complaintId,
          sc.severity,
          sc.context,
          sc.priorityScore,
          sc.priorityBand,
          JSON.stringify(priorityBreakdown),
          team ? team.id : null,
          workerDbId,
          isAssignedOrHigher ? new Date(Date.now() - 36 * 3600 * 1000) : null,
          sc.status === 'IN_PROGRESS' || isResolvedOrVerified ? new Date(Date.now() - 24 * 3600 * 1000) : null,
          isResolvedOrVerified ? new Date(Date.now() - 6 * 3600 * 1000) : null,
          sc.status === 'CITIZEN_VERIFIED' ? new Date(Date.now() - 2 * 3600 * 1000) : null,
          sc.reopenedCount || 0,
          sc.address,
        ]
      );

      // Primary Complaint
      await query(
        `INSERT INTO complaints (
           id, organization_id, issue_id, citizen_id, ward_id, category_id,
           description, lat, lng, is_primary, joined_existing, is_demo,
           address, city, district, state, country, postal_code, location_method, location_confirmed
         ) VALUES (
           ?, ?, ?, ?, ?, ?,
           ?, ?, ?, 1, 0, 1,
           ?, 'Mandsaur', 'Mandsaur', 'Madhya Pradesh', 'India', '458001', 'GPS', 1
         )
         ON DUPLICATE KEY UPDATE
           description = VALUES(description),
           address = VALUES(address),
           citizen_id = VALUES(citizen_id),
           is_demo = 1`,
        [
          sc.complaintId,
          orgId,
          sc.issueId,
          citizenDbId,
          ward.id,
          cat.id,
          sc.description,
          issueLat,
          issueLng,
          sc.address,
        ]
      );

      // Second Complaint (if scenario joins)
      if (sc.secondCitizenIndex !== undefined) {
        const secCitizenDef = DEMO_CITIZENS[sc.secondCitizenIndex % DEMO_CITIZENS.length];
        const secCitizenDbId = userIdMap.get(secCitizenDef.email)!;
        const secCompId = `c2000000-${sc.complaintId.slice(9)}`;
        await query(
          `INSERT INTO complaints (
             id, organization_id, issue_id, citizen_id, ward_id, category_id,
             description, lat, lng, is_primary, joined_existing, is_demo,
             address, city, district, state, country, postal_code, location_method, location_confirmed
           ) VALUES (
             ?, ?, ?, ?, ?, ?,
             ?, ?, ?, 0, 1, 1,
             ?, 'Mandsaur', 'Mandsaur', 'Madhya Pradesh', 'India', '458001', 'MANUAL', 1
           )
           ON DUPLICATE KEY UPDATE
             description = VALUES(description),
             address = VALUES(address),
             citizen_id = VALUES(citizen_id),
             is_demo = 1`,
          [
            secCompId,
            orgId,
            sc.issueId,
            secCitizenDbId,
            ward.id,
            cat.id,
            sc.secondDescription || 'Joined complaint with additional observation.',
            issueLat,
            issueLng,
            sc.address,
          ]
        );
      }

      // Assignment
      if (workerDbId && team) {
        const assignId = `as000000-${sc.issueId.slice(9)}`;
        const endedReason = isResolvedOrVerified ? 'RESOLVED' : null;
        await query(
          `INSERT INTO assignments (
             id, issue_id, team_id, worker_id, assigned_by, assigned_at, accepted_at,
             band_at_assignment, expected_hours, start_was_timely, ended_at, ended_reason
           ) VALUES (
             ?, ?, ?, ?, ?, ?, ?,
             ?, 96, 1, ?, ?
           )
           ON DUPLICATE KEY UPDATE
             team_id = VALUES(team_id),
             worker_id = VALUES(worker_id),
             assigned_by = VALUES(assigned_by),
             ended_reason = VALUES(ended_reason)`,
          [
            assignId,
            sc.issueId,
            team.id,
            workerDbId,
            adminDbId,
            new Date(Date.now() - 36 * 3600 * 1000),
            new Date(Date.now() - 30 * 3600 * 1000),
            sc.priorityBand,
            isResolvedOrVerified ? new Date(Date.now() - 6 * 3600 * 1000) : null,
            endedReason,
          ]
        );
      }

      // Resolution & Ratings
      if (isResolvedOrVerified && workerDbId) {
        const resId = `r0000000-${sc.issueId.slice(9)}`;
        const assignId = `as000000-${sc.issueId.slice(9)}`;
        await query(
          `INSERT INTO resolutions (
             id, issue_id, assignment_id, worker_id, resolved_by_role, note,
             ai_draft_used, proof_count, resolved_at, elapsed_hours, external_delay_hours,
             effective_hours, expected_hours, on_time, citizen_decision, decided_at, reject_reason
           ) VALUES (
             ?, ?, ?, ?, 'WORKER', ?,
             0, 1, ?, 18.5, 0.0,
             18.5, 96, 1, ?, ?, ?
           )
           ON DUPLICATE KEY UPDATE
             note = VALUES(note),
             worker_id = VALUES(worker_id),
             citizen_decision = VALUES(citizen_decision),
             decided_at = VALUES(decided_at),
             reject_reason = VALUES(reject_reason)`,
          [
            resId,
            sc.issueId,
            assignId,
            workerDbId,
            sc.resolutionNote || 'Work completed per specifications.',
            new Date(Date.now() - 6 * 3600 * 1000),
            sc.citizenDecision || 'PENDING',
            sc.citizenDecision === 'VERIFIED' || sc.citizenDecision === 'REJECTED' ? new Date(Date.now() - 2 * 3600 * 1000) : null,
            sc.rejectReason || null,
          ]
        );

        // Media proof
        const mediaId = `m0000000-${sc.issueId.slice(9)}`;
        await query(
          `INSERT INTO media (
             id, organization_id, uploader_id, kind, issue_id, resolution_id,
             storage_path, mime, size_bytes, original_name
           ) VALUES (
             ?, ?, ?, 'RESOLUTION_PROOF', ?, ?,
             'demo/resolution_proof.png', 'image/png', 1024, 'resolution_proof.png'
           )
           ON DUPLICATE KEY UPDATE mime = VALUES(mime)`,
          [mediaId, orgId, workerDbId, sc.issueId, resId]
        );

        // Star rating
        if (sc.citizenDecision === 'VERIFIED' && sc.ratingStars) {
          const ratingId = `rt000000-${sc.issueId.slice(9)}`;
          await query(
            `INSERT INTO ratings (
               id, resolution_id, issue_id, citizen_id, worker_id, stars
             ) VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE stars = VALUES(stars), worker_id = VALUES(worker_id)`,
            [ratingId, resId, sc.issueId, citizenDbId, workerDbId, sc.ratingStars]
          );
        }
      }

      // Audit trail events
      await query(
        `INSERT INTO issue_events (issue_id, actor_id, actor_role, event_type, from_status, to_status, note, metadata)
         VALUES (?, ?, 'CITIZEN', 'STATUS_CHANGE', NULL, 'REPORTED', 'Demo complaint submitted by citizen.', '{}')`,
        [sc.issueId, citizenDbId]
      );
      if (isAssignedOrHigher && workerDbId) {
        await query(
          `INSERT INTO issue_events (issue_id, actor_id, actor_role, event_type, from_status, to_status, note, metadata)
           VALUES (?, ?, 'ADMIN', 'STATUS_CHANGE', 'PRIORITIZED', 'ASSIGNED', 'Assigned to team worker.', '{}')`,
          [sc.issueId, adminDbId]
        );
      }
      if (sc.workerNote && workerDbId) {
        await query(
          `INSERT INTO issue_events (issue_id, actor_id, actor_role, event_type, note, metadata)
           VALUES (?, ?, 'WORKER', 'NOTE', ?, '{}')`,
          [sc.issueId, workerDbId, sc.workerNote]
        );
      }

      // Notification
      const notifId = `n0000000-${sc.issueId.slice(9)}`;
      await query(
        `INSERT INTO notifications (id, user_id, issue_id, type, message, is_read)
         VALUES (?, ?, ?, 'STATUS_UPDATE', ?, 0)
         ON DUPLICATE KEY UPDATE message = VALUES(message)`,
        [notifId, citizenDbId, sc.issueId, `Your complaint regarding "${sc.title}" is currently marked as ${sc.status}.`]
      );

      console.log(`  [ISSUE]   ${sc.status.padEnd(16)} | ${sc.priorityBand.padEnd(8)} | ${sc.title.slice(0, 45)}...`);
    }

    // 6. Write Demo Credentials Manifest to docs/DEMO_CREDENTIALS.md
    const docsDir = path.resolve(process.cwd(), '../docs');
    fs.mkdirSync(docsDir, { recursive: true });
    const manifestPath = path.join(docsDir, 'DEMO_CREDENTIALS.md');

    let manifestContent = `# CivicPulse — Demonstration Accounts & Credentials Manifest

> **Environment**: Local Development & Demonstration  
> **Host URL**: http://localhost:5173 (Frontend) / http://localhost:3001 (Backend API)  
> **Database**: MySQL (Port 3307)  
> **Default Organization**: Demo Panchayat (\`demo-panchayat\`)  
> **Generated Date**: ${new Date().toISOString()}

---

## 1. Municipal Administrators (\`ADMIN\`)

Administrators have access to:
- Comprehensive Issue Management & Dispatch Console (\`/admin/issues\`)
- Priority Override and AI Suggestion Review (\`/admin/issues/:id\`)
- Team & Department Workload Analytics (\`/admin/teams\`)
- Worker Performance & Assignment Distribution (\`/admin/workers\`)
- Intelligence Hotspots & Real-Time Warning Alerts (\`/admin/intelligence\`)
- Ward Metrics & Analytics Dashboard (\`/admin/analytics\`)

| Name | Role | Primary Login (Email / Mobile) | Demo Password | Department / Function |
| :--- | :--- | :--- | :--- | :--- |
| **Rajesh Sharma** | \`ADMIN\` | \`admin@civicpulse.org\` / \`9876543210\` | \`Admin@123456\` | Chief Municipal Officer (CMO) |
| **Priya Verma** | \`ADMIN\` | \`priya.ops@civicpulse.org\` / \`9820011001\` | \`OpsAdmin@2026\` | Operations & Dispatch Lead |
| **Vikramaditya Rao** | \`ADMIN\` | \`vikram.officer@civicpulse.org\` / \`9820011002\` | \`Officer@2026\` | Grievance & Quality Officer |

---

## 2. Department Field Workers (\`WORKER\`)

Field workers have role-restricted access to:
- Field Worker Task Queue (\`/worker/issues\`)
- Task Execution & Resolution Workflow with Photo Proof Uploads (\`/worker/issues/:id\`)
- Worker Performance Scorecard & VRR Tracking (\`/worker/performance\`)

| Name | Department / Team | Primary Login (Email / Mobile) | Demo Password | Specialization |
| :--- | :--- | :--- | :--- | :--- |
| **Ramesh Kumar** | Water Team | \`ramesh.water@civicpulse.org\` / \`9830022001\` | \`WaterWorker@1\` | Senior Water Pipeline Tech |
| **Suresh Meena** | Water Team | \`suresh.water@civicpulse.org\` / \`9830022002\` | \`WaterWorker@2\` | Water Meter & Valve Specialist |
| **Anil Patidar** | Road Maintenance Team | \`anil.roads@civicpulse.org\` / \`9830022003\` | \`RoadWorker@1\` | Asphalt & Pothole Lead |
| **Dinesh Yadav** | Road Maintenance Team | \`dinesh.roads@civicpulse.org\` / \`9830022004\` | \`RoadWorker@2\` | Pavement & Drainage Mason |
| **Manoj Solanki** | Sanitation Team | \`manoj.sanitation@civicpulse.org\` / \`9830022005\` | \`Sanitation@1\` | Sanitation Supervisor |
| **Kailash Gehlot** | Sanitation Team | \`kailash.sanitation@civicpulse.org\` / \`9830022006\` | \`Sanitation@2\` | Drain Clearance Tech |
| **Sunil Rathore** | Streetlight Team | \`sunil.lighting@civicpulse.org\` / \`9830022007\` | \`Streetlight@1\` | Senior Municipal Electrician |
| **Deepak Chouhan** | Streetlight Team | \`deepak.lighting@civicpulse.org\` / \`9830022008\` | \`Streetlight@2\` | LED & Pole Field Tech |

---

## 3. Registered Citizens (\`CITIZEN\`)

Citizens have access to:
- Citizen Dashboard (\`/citizen\`)
- GPS & Interactive Map Complaint Submission (\`/citizen/report\`)
- Complaint Tracking with Real-Time SLA Timeline (\`/citizen/complaints\`)
- Resolution Verification & 1–5 Star Rating Confirmation (\`/citizen/complaints/:id\`)
- Nearby Issues & Similar Issue Community Joining (\`/citizen/nearby\`)
- Notifications Panel (\`/citizen/notifications\`)

| Name | Ward | Primary Login (Email / Mobile) | Demo Password |
| :--- | :--- | :--- | :--- |
| **Aarav Joshi** | Ward 1 | \`aarav.joshi@example.com\` / \`9840033001\` | \`Citizen@123\` |
| **Ananya Sharma** | Ward 2 | \`ananya.sharma@example.com\` / \`9840033002\` | \`Citizen@123\` |
| **Rohan Mehta** | Ward 3 | \`rohan.mehta@example.com\` / \`9840033003\` | \`Citizen@123\` |
| **Pooja Gupta** | Ward 4 | \`pooja.gupta@example.com\` / \`9840033004\` | \`Citizen@123\` |
| **Kavita Patel** | Ward 5 | \`kavita.patel@example.com\` / \`9840033005\` | \`Citizen@123\` |
| **Siddharth Jain** | Ward 6 | \`siddharth.jain@example.com\` / \`9840033006\` | \`Citizen@123\` |
| **Neha Trivedi** | Ward 7 | \`neha.trivedi@example.com\` / \`9840033007\` | \`Citizen@123\` |
| **Amitabh Soni** | Ward 8 | \`amitabh.soni@example.com\` / \`9840033008\` | \`Citizen@123\` |
| **Sunita Choudhary** | Ward 1 | \`sunita.c@example.com\` / \`9840033009\` | \`Citizen@123\` |
| **Harish Tiwari** | Ward 2 | \`harish.tiwari@example.com\` / \`9840033010\` | \`Citizen@123\` |
| **Meera Deshmukh** | Ward 3 | \`meera.d@example.com\` / \`9840033011\` | \`Citizen@123\` |
| **Gopal Das** | Ward 4 | \`gopal.das@example.com\` / \`9840033012\` | \`Citizen@123\` |

---

## 4. How to Log In & Demonstrate Role-Based Features

1. Open http://localhost:5173/login in your web browser.
2. Enter any **Email** (or **Mobile Number**) and corresponding **Password** from the tables above.
3. Click **Sign In**.
4. The system issues a secure JWT cookie and routes directly to the designated dashboard:
   - Admin accounts redirect to \`/admin\`
   - Worker accounts redirect to \`/worker\`
   - Citizen accounts redirect to \`/citizen\`
`;

    fs.writeFileSync(manifestPath, manifestContent, 'utf-8');
    console.log(`\n📄 Demo Credentials Manifest written to: ${manifestPath}`);

    console.log('\n======================================================');
    console.log('🎉 CivicPulse Demo Seeding Completed Successfully!');
    console.log(`Total Administrators Created: ${DEMO_ADMINS.length}`);
    console.log(`Total Workers Created:        ${DEMO_WORKERS.length}`);
    console.log(`Total Citizens Created:       ${DEMO_CITIZENS.length}`);
    console.log(`Total Civic Issues Created:   ${scenarios.length}`);
    console.log('======================================================\n');
  } finally {
    await closePool();
  }
}

if (require.main === module || process.argv[1]?.includes('seed-demo')) {
  seedDemo().catch((err) => {
    console.error('Demo seeding failed:', err);
    process.exit(1);
  });
}
