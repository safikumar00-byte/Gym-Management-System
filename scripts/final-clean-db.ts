import { pool } from '../src/db/index.ts';

async function finalCleanDatabase() {
  const client = await pool.connect();
  try {
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != '__drizzle_migrations'
      ORDER BY table_name;
    `);

    const tableNames = tableRes.rows.map(r => `"${r.table_name}"`);
    console.log(`Truncating ${tableNames.length} application tables with RESTART IDENTITY CASCADE...`);

    if (tableNames.length > 0) {
      await client.query(`TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE;`);
    }

    console.log('\n========================================================');
    console.log('       FINAL PRODUCTION DATABASE CLEAN STATE AUDIT      ');
    console.log('========================================================');
    console.log(String('Table Name').padEnd(32) + 'Rows');
    console.log('--------------------------------------------------------');

    let totalRows = 0;
    for (const row of tableRes.rows) {
      const tName = row.table_name;
      const countRes = await client.query(`SELECT count(*)::int as count FROM "${tName}"`);
      const count = countRes.rows[0].count;
      totalRows += count;
      console.log(String(tName).padEnd(32) + count);
    }

    console.log('--------------------------------------------------------');
    console.log(`Total Tables: ${tableRes.rows.length} | Total Application Rows: ${totalRows}`);
    console.log('========================================================\n');

    if (totalRows === 0) {
      console.log('✅ FINAL PRODUCTION DATABASE IS 100% CLEAN (0 application rows).');
    } else {
      console.error('❌ DATABASE NOT CLEAN!');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

finalCleanDatabase().catch(console.error);
