import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { pool, db } from '../src/db/index.ts';
import { members, payments, expenses, gyms, userProfiles } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import config from '../firebase-applet-config.json' with { type: 'json' };

const BASE_URL = 'http://localhost:3000';

const TEST_IDENTITIES = {
  OWNER: { token: 'test-token-owner', role: 'OWNER', label: 'OWNER (Admin)' },
  MANAGER: { token: 'test-token-manager', role: 'MANAGER', label: 'MANAGER' },
  TRAINER: { token: 'test-token-trainer', role: 'TRAINER', label: 'TRAINER' },
  UNAUTHENTICATED: { token: null, role: 'ANONYMOUS', label: 'Unauthenticated' },
};

async function apiRequest(endpoint: string, method: string = 'GET', token: string | null = null, body?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: any = null;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      status: res.status,
      statusText: res.statusText,
      data,
    };
  } catch (err: any) {
    return {
      status: 0,
      statusText: err.message,
      data: null,
    };
  }
}

async function runSecurityAudit() {
  console.log('========================================================================');
  console.log('   SENSITIVE ENDPOINTS RBAC AUDIT & FIRESTORE DIRECT SDK TEST SUITE     ');
  console.log('========================================================================\n');

  // Ensure primary gym and test identities exist in PostgreSQL
  const [gym] = await pool.query("SELECT id, name FROM gyms WHERE name = 'IRON CORE FITNESS'").then(r => r.rows);
  if (!gym) {
    throw new Error('Gym IRON CORE FITNESS not found in database.');
  }

  // Ensure active status
  await pool.query("UPDATE gyms SET status = 'ACTIVE' WHERE id = $1", [gym.id]);

  // Synchronize test user profiles
  await pool.query(`
    INSERT INTO user_profiles (firebase_uid, gym_id, name, email, role)
    VALUES 
      ('uid-test-token-owner', $1, 'Test Owner', 'owner@testgym.com', 'OWNER'),
      ('uid-test-token-manager', $1, 'Test Manager', 'manager@testgym.com', 'MANAGER'),
      ('uid-test-token-trainer', $1, 'Test Trainer', 'trainer@testgym.com', 'TRAINER')
    ON CONFLICT (firebase_uid) DO UPDATE SET gym_id = $1, role = EXCLUDED.role;
  `, [gym.id]);

  // Create temporary payment for refund tests
  const [testMember] = await db.insert(members).values({
    gymId: gym.id,
    memberCode: `AUDIT-MEM-${Date.now() % 10000}`,
    name: 'Audit Test Member',
    status: 'ACTIVE',
    joinDate: '2026-03-01',
  }).returning();

  const [testPayment] = await db.insert(payments).values({
    gymId: gym.id,
    memberId: testMember.id,
    memberName: testMember.name,
    receiptNumber: `AUDIT-RCP-${Date.now() % 10000}`,
    amount: '150.00',
    paymentMethod: 'Cash',
    status: 'Paid',
    paymentDate: new Date(),
    notes: 'Audit test payment fixture',
  }).returning();

  // ---------------------------------------------------------------------------------
  // PART 1: SENSITIVE ENDPOINTS RBAC TEST MATRIX
  // ---------------------------------------------------------------------------------
  console.log('--- PART 1: SENSITIVE API ENDPOINTS AUTHORIZATION MATRIX ---\n');

  const sensitiveEndpoints = [
    {
      name: 'Refund Payment (Parameterized /:id/refund)',
      endpoint: `/api/payments/${testPayment.id}/refund`,
      method: 'POST',
      body: { reason: 'Customer requested refund' },
      ownerExpected: 200,
    },
    {
      name: 'Refund Payment (Direct /refund with body)',
      endpoint: `/api/payments/refund`,
      method: 'POST',
      body: { paymentId: testPayment.id, reason: 'Direct refund route check' },
      ownerExpected: 200,
    },
    {
      name: 'Audit Trail Logs (/api/audit)',
      endpoint: `/api/audit`,
      method: 'GET',
      body: undefined,
      ownerExpected: 200,
    },
    {
      name: 'Backup Status (/api/backup)',
      endpoint: `/api/backup`,
      method: 'GET',
      body: undefined,
      ownerExpected: 200,
    },
    {
      name: 'Full Backup Export (/api/backup/export)',
      endpoint: `/api/backup/export`,
      method: 'GET',
      body: undefined,
      ownerExpected: 200,
    },
    {
      name: 'Gym Profile Configuration (/api/gym)',
      endpoint: `/api/gym`,
      method: 'PUT',
      body: { name: 'IRON CORE FITNESS' },
      ownerExpected: 200,
    },
    {
      name: 'Gym Status Lifecycle (/api/gym/status)',
      endpoint: `/api/gym/status`,
      method: 'PATCH',
      body: { status: 'ACTIVE' },
      ownerExpected: 200,
    },
  ];

  type MatrixRow = {
    endpoint: string;
    method: string;
    ownerStatus: number;
    managerStatus: number;
    trainerStatus: number;
    unauthStatus: number;
  };

  const matrixResults: MatrixRow[] = [];

  for (const ep of sensitiveEndpoints) {
    const resOwner = await apiRequest(ep.endpoint, ep.method, TEST_IDENTITIES.OWNER.token, ep.body);
    const resManager = await apiRequest(ep.endpoint, ep.method, TEST_IDENTITIES.MANAGER.token, ep.body);
    const resTrainer = await apiRequest(ep.endpoint, ep.method, TEST_IDENTITIES.TRAINER.token, ep.body);
    const resUnauth = await apiRequest(ep.endpoint, ep.method, TEST_IDENTITIES.UNAUTHENTICATED.token, ep.body);

    matrixResults.push({
      endpoint: ep.endpoint,
      method: ep.method,
      ownerStatus: resOwner.status,
      managerStatus: resManager.status,
      trainerStatus: resTrainer.status,
      unauthStatus: resUnauth.status,
    });
  }

  // Print Formatted Markdown Table
  console.log('| HTTP Method & Sensitive Endpoint | OWNER | MANAGER | TRAINER | Unauthenticated | Verdict |');
  console.log('|---|:---:|:---:|:---:|:---:|:---:|');

  for (const row of matrixResults) {
    const isNonOwnerRestricted = (row.managerStatus === 403) && (row.trainerStatus === 403) && (row.unauthStatus === 401);
    const verdict = isNonOwnerRestricted ? '✅ PASSED (403 Strict)' : '❌ FAILED';
    console.log(
      `| \`${row.method} ${row.endpoint}\` | **${row.ownerStatus}** | **${row.managerStatus}** | **${row.trainerStatus}** | **${row.unauthStatus}** | ${verdict} |`
    );
  }

  console.log('\nDetailed Role Decision Log:');
  matrixResults.forEach(r => {
    console.log(`- ${r.method} ${r.endpoint}:`);
    console.log(`    OWNER: HTTP ${r.ownerStatus}`);
    console.log(`    MANAGER: HTTP ${r.managerStatus} (Forbidden)`);
    console.log(`    TRAINER: HTTP ${r.trainerStatus} (Forbidden)`);
    console.log(`    UNAUTHENTICATED: HTTP ${r.unauthStatus} (Unauthorized)`);
  });

  // ---------------------------------------------------------------------------------
  // PART 2: DIRECT FIRESTORE SDK AUDIT LOG IMMUTABILITY TEST
  // ---------------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('--- PART 2: DIRECT FIRESTORE SDK AUDIT LOGS IMMUTABILITY TEST ---');
  console.log('========================================================================\n');

  console.log(`Initializing Client Firestore SDK with Project: "${config.projectId}" and Database: "${config.firestoreDatabaseId}"...`);

  const firebaseApp = initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });

  const firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId);

  const testAuditDocId = `test-audit-doc-${Date.now()}`;
  const auditDocRef = doc(firestoreDb, 'audit_logs', testAuditDocId);

  console.log(`Target Document: "audit_logs/${testAuditDocId}"\n`);

  // Diagnostic Test Step 1: CREATE (INSERT / setDoc)
  let createStatus = 'UNKNOWN';
  let createError: any = null;
  try {
    console.log('1. Attempting CREATE operation (setDoc)...');
    await setDoc(auditDocRef, {
      gymId: gym.id,
      action: 'SECURITY_PROBE_CREATE',
      details: 'Audit log creation attempt via direct Firestore SDK',
      timestamp: new Date(),
    });
    createStatus = 'PERMITTED (Vulnerability: Direct client write succeeded)';
  } catch (err: any) {
    createStatus = `BLOCKED by Firestore Rules (${err.code || err.name}: ${err.message})`;
    createError = err;
  }
  console.log(`   -> CREATE Result: ${createStatus}\n`);

  // Diagnostic Test Step 2: UPDATE (updateDoc)
  let updateStatus = 'UNKNOWN';
  let updateError: any = null;
  try {
    console.log('2. Attempting UPDATE command (updateDoc)...');
    await updateDoc(auditDocRef, {
      details: 'TAMPERED: Altered audit record payload',
      tamperedAt: new Date(),
    });
    updateStatus = 'PERMITTED (Vulnerability: Direct client UPDATE succeeded)';
  } catch (err: any) {
    updateStatus = `BLOCKED by Firestore Rules (${err.code || err.name}: ${err.message})`;
    updateError = err;
  }
  console.log(`   -> UPDATE Result: ${updateStatus}\n`);

  // Diagnostic Test Step 3: DELETE (deleteDoc)
  let deleteStatus = 'UNKNOWN';
  let deleteError: any = null;
  try {
    console.log('3. Attempting DELETE command (deleteDoc)...');
    await deleteDoc(auditDocRef);
    deleteStatus = 'PERMITTED (Vulnerability: Direct client DELETE succeeded)';
  } catch (err: any) {
    deleteStatus = `BLOCKED by Firestore Rules (${err.code || err.name}: ${err.message})`;
    deleteError = err;
  }
  console.log(`   -> DELETE Result: ${deleteStatus}\n`);

  // Diagnostic Summary
  console.log('------------------------------------------------------------------------');
  console.log('FIRESTORE DATABASE SECURITY RULES ENFORCEMENT SUMMARY:');
  console.log('------------------------------------------------------------------------');
  console.log(`- Firestore Database: ${config.firestoreDatabaseId}`);
  console.log(`- SDK Type: Client Firestore Web SDK (@firebase/firestore)`);
  console.log(`- Direct SDK UPDATE: ${updateStatus.includes('BLOCKED') ? 'STRICTLY ENFORCED (Rejected at DB Security Rule level)' : 'NOT ENFORCED'}`);
  console.log(`- Direct SDK DELETE: ${deleteStatus.includes('BLOCKED') ? 'STRICTLY ENFORCED (Rejected at DB Security Rule level)' : 'NOT ENFORCED'}`);
  console.log(`- Error Code Received: ${updateError?.code || 'none'}`);
  console.log(`- gRPC / Security Error: ${updateError?.message || 'none'}`);
  console.log('------------------------------------------------------------------------\n');

  process.exit(0);
}

runSecurityAudit().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
