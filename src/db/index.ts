import * as dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export interface DbConfigSummary {
  host: string;
  port: number;
  database: string;
  user: string;
  mode: string;
  ssl: boolean;
  hasPassword: boolean;
  hasDatabaseUrl: boolean;
}

export function getDatabaseConfigSummary(): DbConfigSummary {
  let host = process.env.SQL_HOST || '127.0.0.1';
  let port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
  let user = process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'postgres';
  let database = process.env.SQL_DB_NAME || 'postgres';
  const hasPassword = Boolean(process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.DATABASE_URL);
  const ssl = process.env.SQL_SSL === 'true' || (process.env.DATABASE_URL?.includes('sslmode=') ?? false);
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      host = parsed.hostname || host;
      port = parsed.port ? parseInt(parsed.port, 10) : port;
      user = decodeURIComponent(parsed.username || user);
      database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : database;
    } catch (_) {}
  }

  const mode = process.env.DATABASE_MODE || (host.includes('pooler.supabase.com') ? 'supabase-pooler' : (host.includes('supabase.co') ? 'supabase-direct' : 'direct'));

  return {
    host,
    port,
    database,
    user,
    mode,
    ssl,
    hasPassword,
    hasDatabaseUrl,
  };
}

export function formatDatabaseError(err: any): { code: string; message: string; guidance: string } {
  const summary = getDatabaseConfigSummary();
  const code = err?.code || err?.cause?.code || 'UNKNOWN';
  const rawMessage = err?.message || String(err);

  let guidance = 'Verify your database configuration in .env and ensure PostgreSQL is accessible.';

  if (code === 'ECONNREFUSED' || rawMessage.includes('ECONNREFUSED')) {
    guidance = `PostgreSQL is not listening at ${summary.host}:${summary.port}.\n` +
      `  • If using Supabase:\n` +
      `      Verify DATABASE_URL in .env (Direct: db.<project-ref>.supabase.co:5432 or Pooler: aws-0-<region>.pooler.supabase.com:5432).\n` +
      `  • If using Cloud SQL Auth Proxy (Rollback/Legacy):\n` +
      `      Start proxy in another terminal: cloud-sql-proxy <INSTANCE_CONNECTION_NAME> --port ${summary.port}\n` +
      `  • If using local PostgreSQL:\n` +
      `      Start local PostgreSQL service or Docker: docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=${summary.database} postgres:16-alpine`;
  } else if (code === '28P01' || rawMessage.includes('password authentication failed')) {
    guidance = `Authentication failed for user '${summary.user}'. Check your database password in DATABASE_URL or SQL_PASSWORD in .env.`;
  } else if (code === '3D000' || rawMessage.includes('does not exist')) {
    guidance = `Database '${summary.database}' does not exist on ${summary.host}:${summary.port}. Default Supabase database is 'postgres'.`;
  } else if (code === '42P01' || rawMessage.includes('relation') && rawMessage.includes('does not exist')) {
    guidance = `Database tables are missing. Apply migrations using: npm run db:migrate`;
  } else if (code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
    guidance = `Cannot reach database host '${summary.host}'. Check host name, DNS resolution (IPv4/IPv6), and firewall settings.`;
  }

  return {
    code,
    message: rawMessage,
    guidance,
  };
}

import * as fs from 'fs';
import * as path from 'path';

export function getSslConfig(): boolean | { rejectUnauthorized: boolean; ca?: string } {
  const caPath = process.env.DATABASE_CA_CERT_PATH || path.join(process.cwd(), 'certs', 'supabase-ca.crt');
  const caCert = process.env.DATABASE_CA_CERT || (fs.existsSync(caPath) ? fs.readFileSync(caPath, 'utf8') : undefined);

  if (caCert) {
    return { rejectUnauthorized: true, ca: caCert };
  }

  const sslEnabled = process.env.SQL_SSL === 'true' || (process.env.DATABASE_URL?.includes('sslmode=') ?? false);
  if (sslEnabled) {
    return { rejectUnauthorized: false };
  }
  return false;
}

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    const summary = getDatabaseConfigSummary();
    const sslConfig = getSslConfig();

    const rawUrl = process.env.DATABASE_URL;
    const cleanUrl = rawUrl ? rawUrl.replace(/[\?&]sslmode=[^&]+/, '') : undefined;
    
    const poolConfig: PoolConfig = cleanUrl
      ? {
          connectionString: cleanUrl,
          ssl: sslConfig,
          max: parseInt(process.env.SQL_MAX_CONNECTIONS || '10', 10),
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
        }
      : {
          host: summary.host,
          port: summary.port,
          user: summary.user,
          password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || '',
          database: summary.database,
          ssl: sslConfig,
          max: parseInt(process.env.SQL_MAX_CONNECTIONS || '10', 10),
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
        };

    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (err) => {
      console.error('[DB Pool] Unexpected error on idle SQL pool client:', err.message || err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });

export async function checkDatabaseConnection(): Promise<{
  ok: boolean;
  latencyMs?: number;
  summary: DbConfigSummary;
  error?: { code: string; message: string; guidance: string };
}> {
  const summary = getDatabaseConfigSummary();
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1 AS health_check;');
      const latencyMs = Date.now() - start;
      return { ok: true, latencyMs, summary };
    } finally {
      client.release();
    }
  } catch (err: any) {
    const formatted = formatDatabaseError(err);
    return { ok: false, summary, error: formatted };
  }
}

export { pool };
