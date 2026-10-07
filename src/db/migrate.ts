import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { getSslConfig } from './index.ts';

const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const cleanUrl = migrationUrl ? migrationUrl.replace(/[\?&]sslmode=[^&]+/, '') : undefined;

const migrationPool = new Pool(
  cleanUrl
    ? {
        connectionString: cleanUrl,
        ssl: getSslConfig(),
        max: 2,
        connectionTimeoutMillis: 10000,
      }
    : {
        host: process.env.SQL_HOST || '127.0.0.1',
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
        user: process.env.SQL_USER || 'postgres',
        password: process.env.SQL_PASSWORD || '',
        database: process.env.SQL_DB_NAME || 'postgres',
        ssl: getSslConfig(),
        max: 2,
        connectionTimeoutMillis: 10000,
      }
);

async function runMigration() {
  console.log('[Migration] Starting migration against Supabase PostgreSQL (Direct connection)...');
  const client = await migrationPool.connect();
  const startTime = Date.now();

  try {
    // 1. Ensure Drizzle migration tracking schema and table exist
    await client.query(`CREATE SCHEMA IF NOT EXISTS "drizzle";`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    // 2. Check applied migrations
    const existing = await client.query(`SELECT hash, created_at FROM "drizzle"."__drizzle_migrations"`);
    const appliedTimestamps = new Set(existing.rows.map(r => String(r.created_at)));

    // 3. Read migration file
    const sqlFilePath = path.join(process.cwd(), 'drizzle', '0000_sloppy_silver_fox.sql');
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Migration file not found at ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    const migrationTimestamp = 1791098966983; // from _journal.json

    if (appliedTimestamps.has(String(migrationTimestamp))) {
      console.log('[Migration] ℹ️ Migration 0000_sloppy_silver_fox is already applied.');
      return;
    }

    const hash = crypto.createHash('sha256').update(sqlContent).digest('hex');

    // 4. Split statements by breakpoint
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`[Migration] Executing ${statements.length} DDL statements inside an atomic transaction...`);

    await client.query('BEGIN');

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt);
      } catch (err: any) {
        console.error(`[Migration] ❌ Error executing statement #${i + 1}:`);
        console.error(stmt);
        console.error(`Error details: ${err.message}`);
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Record migration in Drizzle history
    await client.query(
      `INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2);`,
      [hash, migrationTimestamp]
    );

    await client.query('COMMIT');
    const duration = Date.now() - startTime;
    console.log(`[Migration] 🎉 Successfully applied all ${statements.length} statements in ${duration}ms!`);
  } catch (error: any) {
    console.error('[Migration] ❌ Migration failed:', error.message || error);
    process.exit(1);
  } finally {
    client.release();
    await migrationPool.end();
  }
}

runMigration();
