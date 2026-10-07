import * as dotenv from 'dotenv';
dotenv.config();

import { Client } from 'pg';

async function runTest() {
  const host = process.env.SQL_HOST || 'db.uachezapaptspsazgxdh.supabase.co';
  const port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
  const user = process.env.SQL_USER || 'postgres';
  const database = process.env.SQL_DB_NAME || 'postgres';
  const rawPassword = process.env.SQL_PASSWORD || '';

  console.log('Connecting with 25s timeout:');
  console.log(`  Host:     ${host}`);
  console.log(`  Port:     ${port}`);
  console.log(`  Database: ${database}`);
  console.log(`  User:     ${user}`);

  try {
    const client = new Client({
      host,
      port,
      user,
      password: rawPassword,
      database,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 25000,
    });
    await client.connect();
    const res = await client.query('SELECT 1 as ping, version(), current_database(), current_user;');
    console.log('🎉 SUCCESS! Connection & Authentication PASSED!');
    console.log(`   Database: ${res.rows[0].current_database}`);
    console.log(`   User:     ${res.rows[0].current_user}`);
    console.log(`   Version:  ${res.rows[0].version?.substring(0, 60)}...`);
    await client.end();
    return true;
  } catch (err: any) {
    console.error(`❌ Connection Failed: ${err.message} (${err.code || 'NO_CODE'})`);
    return false;
  }
}

runTest();
