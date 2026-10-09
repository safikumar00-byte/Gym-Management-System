import { pool } from '../src/db/index.ts';

async function auditMyFitnessGyms() {
  const client = await pool.connect();
  try {
    const gymsRes = await client.query(`
      SELECT 
        g.id as gym_id, 
        g.name as gym_name, 
        g.email as gym_email, 
        g.phone as gym_phone, 
        g.status as gym_status,
        g.created_at as gym_created_at,
        up.id as user_id, 
        up.firebase_uid, 
        up.email as user_email, 
        up.name as user_name, 
        up.role as user_role,
        up.created_at as user_created_at
      FROM gyms g 
      LEFT JOIN user_profiles up ON g.id = up.gym_id 
      ORDER BY g.created_at ASC
    `);

    console.log('========================================================================');
    console.log('COMPLETE READ-ONLY DATABASE INVENTORY OF ALL WORKSPACES & PROFILES');
    console.log('========================================================================\n');

    for (const g of gymsRes.rows) {
      const countsRes = await client.query(`
        SELECT 
          (SELECT count(*)::int FROM members WHERE gym_id = $1) as members,
          (SELECT count(*)::int FROM membership_plans WHERE gym_id = $1) as plans,
          (SELECT count(*)::int FROM memberships WHERE gym_id = $1) as memberships,
          (SELECT count(*)::int FROM payments WHERE gym_id = $1) as payments,
          (SELECT count(*)::int FROM expenses WHERE gym_id = $1) as expenses,
          (SELECT count(*)::int FROM notifications WHERE gym_id = $1) as notifications,
          (SELECT count(*)::int FROM audit_logs WHERE gym_id = $1) as audit_logs,
          (SELECT count(*)::int FROM member_attendance WHERE gym_id = $1) as attendance,
          (SELECT count(*)::int FROM member_workouts WHERE gym_id = $1) as workouts,
          (SELECT count(*)::int FROM community_posts WHERE gym_id = $1) as posts
      `, [g.gym_id]);

      const counts = countsRes.rows[0];

      console.log(`------------------------------------------------------------------------`);
      console.log(`GYM: "${g.gym_name}" (ID: ${g.gym_id})`);
      console.log(`Status: ${g.gym_status} | Created At: ${g.gym_created_at}`);
      console.log(`Gym Contact: Email: "${g.gym_email || 'none'}", Phone: "${g.gym_phone || 'none'}"`);
      console.log(`Owner: "${g.user_name}" | Email: "${g.user_email}" | Role: ${g.user_role}`);
      console.log(`Firebase UID: "${g.firebase_uid}" (Created: ${g.user_created_at})`);
      console.log(`Related Records Count:`);
      console.log(`  - Members: ${counts.members}`);
      console.log(`  - Membership Plans: ${counts.plans}`);
      console.log(`  - Active/Past Memberships: ${counts.memberships}`);
      console.log(`  - Payments / Receipts: ${counts.payments}`);
      console.log(`  - Expenses: ${counts.expenses}`);
      console.log(`  - Attendance Records: ${counts.attendance}`);
      console.log(`  - Workouts: ${counts.workouts}`);
      console.log(`  - Community Posts: ${counts.posts}`);
      console.log(`  - Notifications: ${counts.notifications}`);
      console.log(`  - Audit Logs: ${counts.audit_logs}`);
    }

    console.log('\n========================================================================\n');
  } finally {
    client.release();
    await pool.end();
  }
}

auditMyFitnessGyms().catch(console.error);
