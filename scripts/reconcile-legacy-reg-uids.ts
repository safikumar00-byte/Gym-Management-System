import { pool } from '../src/db/index.ts';

async function reconcileLegacyRegUids() {
  const client = await pool.connect();
  try {
    console.log('Starting reconciliation of legacy synthetic reg-* profiles...');

    await client.query('BEGIN');

    // 1. Find all reg-* profiles
    const regProfilesRes = await client.query(`
      SELECT id, firebase_uid, gym_id, name, email, role 
      FROM user_profiles 
      WHERE firebase_uid LIKE 'reg-%'
    `);

    console.log(`Found ${regProfilesRes.rows.length} synthetic reg-* profiles.`);

    for (const regProfile of regProfilesRes.rows) {
      console.log(`Processing reg profile ${regProfile.firebase_uid} for email: ${regProfile.email}, gym: ${regProfile.gym_id}`);

      // Find if there is a real Firebase UID profile for the same email
      const realProfileRes = await client.query(`
        SELECT id, firebase_uid, gym_id, name, email, role 
        FROM user_profiles 
        WHERE email = $1 AND firebase_uid NOT LIKE 'reg-%'
      `, [regProfile.email]);

      if (realProfileRes.rows.length > 0) {
        const realProfile = realProfileRes.rows[0];
        const dummyGymId = realProfile.gym_id;
        const realGymId = regProfile.gym_id;

        console.log(`Found matching real Firebase profile ${realProfile.firebase_uid}. Linking to registered gym ${realGymId} and cleaning dummy gym ${dummyGymId}...`);

        // Update real profile to point to the registered gym
        await client.query(`
          UPDATE user_profiles 
          SET gym_id = $1, name = COALESCE(NULLIF($2, ''), name), updated_at = NOW() 
          WHERE id = $3
        `, [realGymId, regProfile.name, realProfile.id]);

        // Delete synthetic profile
        await client.query(`DELETE FROM user_profiles WHERE id = $1`, [regProfile.id]);

        // Check if dummy gym has any members/payments/expenses
        const memberCountRes = await client.query(`SELECT count(*)::int as c FROM members WHERE gym_id = $1`, [dummyGymId]);
        if (memberCountRes.rows[0].c === 0 && dummyGymId !== realGymId) {
          console.log(`Deleting empty auto-created dummy gym ${dummyGymId}...`);
          await client.query(`DELETE FROM gyms WHERE id = $1`, [dummyGymId]);
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Reconciliation completed successfully.');

    // Verify remaining profiles
    const remainingRes = await client.query(`
      SELECT up.id, up.firebase_uid, up.email, up.name, up.role, g.name as gym_name, g.id as gym_id 
      FROM user_profiles up
      JOIN gyms g ON up.gym_id = g.id
      ORDER BY up.created_at
    `);
    console.log('\n--- ACTIVE USER PROFILES IN DATABASE ---');
    console.table(remainingRes.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during reconciliation:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

reconcileLegacyRegUids().catch(console.error);
