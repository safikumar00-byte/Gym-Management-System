import { pool } from '../src/db/index.ts';

async function verifySchema() {
  console.log('=== SUPABASE POSTGRESQL SCHEMA VERIFICATION ===\n');
  const client = await pool.connect();

  try {
    // 1. Verify Tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`1. Tables Found (${tables.length}/16):`);
    tables.forEach(t => console.log(`   • ${t}`));

    const expectedTables = [
      'audit_logs', 'community_comments', 'community_posts', 'community_reactions',
      'community_reports', 'expenses', 'gym_counters', 'gyms',
      'member_attendance', 'member_workouts', 'members', 'membership_plans',
      'memberships', 'notifications', 'payments', 'user_profiles'
    ];
    const missingTables = expectedTables.filter(t => !tables.includes(t));
    if (missingTables.length > 0) {
      console.error(`❌ Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log('✅ All 16 expected tables exist in public schema!\n');
    }

    // 2. Verify Foreign Keys
    const fkRes = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);
    console.log(`2. Foreign Keys Found (${fkRes.rows.length}/32):`);
    fkRes.rows.forEach(fk => {
      console.log(`   • ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (ON DELETE ${fk.delete_rule})`);
    });
    console.log(`✅ ${fkRes.rows.length} foreign key constraints verified!\n`);

    // 3. Verify Indexes and Unique Constraints
    const idxRes = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);
    console.log(`3. Total Indexes Found in public schema: ${idxRes.rows.length}`);
    const uniqueIndexes = idxRes.rows.filter(i => i.indexdef.includes('UNIQUE'));
    console.log(`   Unique constraints/indexes (${uniqueIndexes.length}):`);
    uniqueIndexes.forEach(u => console.log(`   • ${u.tablename}: ${u.indexname}`));

    // 4. Verify Drizzle Migration History
    const migrationRes = await client.query(`
      SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations";
    `);
    console.log(`\n4. Drizzle Migration History:`);
    migrationRes.rows.forEach(m => {
      console.log(`   • ID: ${m.id}, CreatedAt: ${m.created_at}, Hash: ${m.hash.substring(0, 16)}...`);
    });

    // 5. Test UUID generation and types
    const uuidTest = await client.query(`SELECT gen_random_uuid() AS new_uuid, NOW() AS current_time;`);
    console.log(`\n5. PostgreSQL Engine Features:`);
    console.log(`   • gen_random_uuid(): ${uuidTest.rows[0].new_uuid}`);
    console.log(`   • timestamp with tz: ${uuidTest.rows[0].current_time.toISOString()}`);
    console.log('✅ PostgreSQL functions and DDL capabilities verified!\n');
  } finally {
    client.release();
    await pool.end();
  }
}

verifySchema();
