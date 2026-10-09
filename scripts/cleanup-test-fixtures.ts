import { pool } from '../src/db/index.ts';

async function cleanupTestFixtures() {
  const client = await pool.connect();
  try {
    await client.query(`
      DELETE FROM gyms 
      WHERE name LIKE 'Apex Performance%' 
         OR name LIKE 'Google Fitness Hub%' 
         OR name LIKE 'Verified UID Gym%' 
         OR name LIKE 'Branch 2 Gym%' 
         OR name LIKE 'Recovered Gym%'
    `);
    console.log('Cleaned test fixture gyms.');

    const remaining = await client.query(`
      SELECT up.id, up.firebase_uid, up.email, up.name, up.role, g.name as gym_name, g.id as gym_id 
      FROM user_profiles up 
      JOIN gyms g ON up.gym_id = g.id
      ORDER BY up.created_at
    `);
    console.log('\n--- PRODUCTION & RECONCILED DATABASE STATE ---');
    console.table(remaining.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupTestFixtures().catch(console.error);
