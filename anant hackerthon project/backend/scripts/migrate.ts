import fs from 'fs';
import path from 'path';
import { getPool, closePool, query } from '../src/lib/db';

async function migrate() {
  console.log('--- CivicPulse MySQL Database Migration ---');

  try {
    // 1. Ensure migrations tracking table exists
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Discover migrations in database/migrations
    const migrationsDir = path.resolve(process.cwd(), '../database/migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows: appliedRows } = await query<{ version: string }>(
      'SELECT version FROM schema_migrations'
    );
    const appliedVersions = new Set(appliedRows.map((r) => r.version));

    for (const file of files) {
      if (appliedVersions.has(file)) {
        console.log(`[SKIPPED] ${file} (already applied)`);
        continue;
      }

      console.log(`[APPLYING] ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      try {
        await query(sql);
        await query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
        console.log(`[SUCCESS]  ${file} applied.`);
      } catch (err) {
        console.error(`[FAILED]   Error applying ${file}:`, err);
        throw err;
      }
    }

    console.log('All migrations applied successfully.');
  } finally {
    await closePool();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
