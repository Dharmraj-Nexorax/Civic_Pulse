import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query, closePool } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import { config } from '../src/lib/config';

async function seed() {
  console.log('--- CivicPulse MySQL Database Seeding ---');

  if (isNaN(config.seedCenterLat) || isNaN(config.seedCenterLng)) {
    throw new Error(
      'SEED_CENTER_LAT and SEED_CENTER_LNG are REQUIRED for seeding. The specification does not invent a location.'
    );
  }

  try {
    // 1. Run database/seeds/001_base.sql
    const baseSqlPath = path.resolve(process.cwd(), '../database/seeds/001_base.sql');
    if (!fs.existsSync(baseSqlPath)) {
      throw new Error(`Base seed file not found at: ${baseSqlPath}`);
    }

    console.log('[APPLYING] 001_base.sql...');
    const baseSql = fs.readFileSync(baseSqlPath, 'utf-8');
    await query(baseSql);
    console.log('[SUCCESS]  001_base.sql applied.');

    // Fetch default org id
    const { rows: orgRows } = await query<{ id: string }>(
      'SELECT id FROM organizations WHERE slug = ?',
      [config.defaultOrgSlug]
    );
    if (orgRows.length === 0) {
      throw new Error(`Default organization slug '${config.defaultOrgSlug}' not found.`);
    }
    const orgId = orgRows[0].id;

    // 2. Create Wards 1..8 around center lat/lng
    console.log(`[SEEDING]  Creating Wards 1..8 around (${config.seedCenterLat}, ${config.seedCenterLng})...`);
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
      const wardLat = Number((config.seedCenterLat + w.dLat).toFixed(6));
      const wardLng = Number((config.seedCenterLng + w.dLng).toFixed(6));
      const wardId = crypto.randomUUID();

      await query(
        `INSERT INTO wards (id, organization_id, name, center_lat, center_lng, radius_m)
         VALUES (?, ?, ?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE center_lat = VALUES(center_lat), center_lng = VALUES(center_lng)`,
        [wardId, orgId, w.name, wardLat, wardLng]
      );
    }
    console.log('[SUCCESS]  Wards created/updated.');

    // 3. Create First Admin User
    console.log(`[SEEDING]  Creating admin user (${config.seedAdminEmail || config.seedAdminMobile})...`);
    const adminMobile = config.seedAdminMobile ? config.seedAdminMobile.trim() : null;
    const adminEmail = config.seedAdminEmail ? config.seedAdminEmail.trim().toLowerCase() : null;

    if (!adminMobile && !adminEmail) {
      throw new Error('SEED_ADMIN_MOBILE or SEED_ADMIN_EMAIL must be provided.');
    }

    const { rows: existingAdmin } = await query<{ id: string }>(
      `SELECT id FROM users
       WHERE organization_id = ? AND (
         (? IS NOT NULL AND mobile = ?) OR
         (? IS NOT NULL AND email = ?)
       )`,
      [orgId, adminMobile, adminMobile, adminEmail, adminEmail]
    );

    if (existingAdmin.length === 0) {
      const pwdHash = await hashPassword(config.seedAdminPassword);
      const adminId = crypto.randomUUID();
      await query(
        `INSERT INTO users (
           id, organization_id, role, full_name, mobile, email, password_hash, is_active, is_demo
         ) VALUES (?, ?, 'ADMIN', ?, ?, ?, ?, 1, 0)`,
        [adminId, orgId, config.seedAdminName, adminMobile, adminEmail, pwdHash]
      );
      console.log('[SUCCESS]  Admin user created.');
    } else {
      console.log('[SKIPPED] Admin user already exists.');
    }

    console.log('Seeding finished successfully.');
  } finally {
    await closePool();
  }
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
