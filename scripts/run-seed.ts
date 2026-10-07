import { seedDatabaseIfEmpty } from '../src/db/seed.ts';
import { pool } from '../src/db/index.ts';

async function main() {
  console.log('=== RUNNING IDEMPOTENT SEED CHECK ===\n');
  try {
    const result = await seedDatabaseIfEmpty();
    console.log('Seed result:', result);
  } catch (error) {
    console.error('Seed execution error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
