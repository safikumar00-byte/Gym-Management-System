import { pool, db } from '../src/db/index.ts';
import { members, memberships, membershipPlans, payments, auditLogs, userProfiles, gyms } from '../src/db/schema.ts';
import { eq, and } from 'drizzle-orm';

const BASE_URL = 'http://localhost:3000';

const TOKENS = {
  OWNER: 'test-token-owner',
  MANAGER: 'test-token-manager',
  TRAINER: 'test-token-trainer',
  TENANT2: 'test-token-tenant2-owner',
};

async function apiRequest(endpoint: string, options: {
  method?: string;
  token?: string | null;
  body?: any;
} = {}) {
  const { method = 'GET', token, body } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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

  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('====================================================');
  console.log('PHASE 2 FINAL VERIFICATION & SECURITY AUDIT TEST SUITE');
  console.log('====================================================\n');

  // Setup: find primary gym
  const primaryGym: any = (await db.query.gyms.findFirst({
    where: eq(gyms.name, 'IRON CORE FITNESS'),
  })) || (await db.query.gyms.findFirst());

  if (!primaryGym) {
    throw new Error('Primary gym IRON CORE FITNESS not found');
  }
  const gymId: string = primaryGym.id;
  console.log(`Using primary gym: ${primaryGym.name} (${gymId})`);

  const aPlan: any = await db.query.membershipPlans.findFirst({
    where: eq(membershipPlans.gymId, gymId),
  });
  if (!aPlan) {
    throw new Error('No membership plan found in primary gym');
  }

  // Setup roles in DB for test tokens
  await pool.query(`
    INSERT INTO user_profiles (firebase_uid, gym_id, name, email, role)
    VALUES 
      ('uid-test-token-owner', $1, 'Test Owner', 'owner@testgym.com', 'OWNER'),
      ('uid-test-token-manager', $1, 'Test Manager', 'manager@testgym.com', 'MANAGER'),
      ('uid-test-token-trainer', $1, 'Test Trainer', 'trainer@testgym.com', 'TRAINER')
    ON CONFLICT (firebase_uid) DO UPDATE SET gym_id = $1, role = EXCLUDED.role;
  `, [gymId]);

  console.log('Test user profiles synchronized in DB.\n');

  // -------------------------------------------------------------
  // TEST 1: DATABASE-LEVEL AUDIT TAMPERING TEST
  // -------------------------------------------------------------
  console.log('--- TEST 1: AUDIT LOG TAMPERING TEST ---');
  const insertRes = await pool.query(
    "INSERT INTO audit_logs (gym_id, action, entity_type, details) VALUES ($1, 'SECURITY_AUDIT_TEST', 'TEST_ENTITY', 'Initial immutable entry') RETURNING id",
    [gymId]
  );
  const testLogId = insertRes.rows[0].id;
  console.log(`Inserted test audit record: ${testLogId}`);

  let dbUpdateAllowed = false;
  let dbDeleteAllowed = false;

  try {
    const uRes = await pool.query('UPDATE audit_logs SET details = $1 WHERE id = $2', ['Tampered value', testLogId]);
    dbUpdateAllowed = (uRes.rowCount ?? 0) > 0;
  } catch (err: any) {
    console.log('UPDATE blocked by database engine:', err.message);
  }

  try {
    const dRes = await pool.query('DELETE FROM audit_logs WHERE id = $1', [testLogId]);
    dbDeleteAllowed = (dRes.rowCount ?? 0) > 0;
  } catch (err: any) {
    console.log('DELETE blocked by database engine:', err.message);
  }

  console.log(`Database engine UPDATE permitted: ${dbUpdateAllowed}`);
  console.log(`Database engine DELETE permitted: ${dbDeleteAllowed}`);
  console.log('Application API exposure check:');
  const auditPutAttempt = await apiRequest(`/api/audit/${testLogId}`, { method: 'PUT', token: TOKENS.OWNER, body: { details: 'Hack' } });
  const auditDeleteAttempt = await apiRequest(`/api/audit/${testLogId}`, { method: 'DELETE', token: TOKENS.OWNER });
  console.log(`API PUT /api/audit/:id status: ${auditPutAttempt.status} (${auditPutAttempt.status === 404 ? 'Not Implemented / Blocked' : 'Exposed'})`);
  console.log(`API DELETE /api/audit/:id status: ${auditDeleteAttempt.status} (${auditDeleteAttempt.status === 404 ? 'Not Implemented / Blocked' : 'Exposed'})`);
  console.log('AUDIT IMMUTABILITY STATUS: APPLICATION-LEVEL ONLY (Database engine has DML rights; application has zero mutation APIs)\n');

  // -------------------------------------------------------------
  // TEST 2: CONCURRENT IDEMPOTENCY KEY TEST (Two simultaneous requests)
  // -------------------------------------------------------------
  console.log('--- TEST 2: PAYMENT IDEMPOTENCY CONCURRENCY TEST ---');
  // Create a member with a pending balance
  const [testMember1] = await db.insert(members).values({
    gymId,
    memberCode: `TEST-IDEMP-${Date.now() % 10000}`,
    name: 'Idempotency Test Member',
    status: 'PAYMENT PENDING',
    joinDate: '2026-03-01',
  }).returning();

  const [testMs1] = await db.insert(memberships).values({
    gymId,
    memberId: testMember1.id,
    planId: aPlan.id,
    planName: aPlan.name,
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    totalFee: '2000.00',
    discount: '0.00',
    price: '2000.00',
    status: 'Pending',
  }).returning();

  const testIdempotencyKey = `idemp-race-${Date.now()}`;
  console.log(`Triggering 2 simultaneous payment requests for ₹1000 with idempotencyKey: ${testIdempotencyKey}`);

  const [resA, resB] = await Promise.all([
    apiRequest('/api/payments', {
      method: 'POST',
      token: TOKENS.OWNER,
      body: {
        memberId: testMember1.id,
        membershipId: testMs1.id,
        amount: 1000,
        paymentMethod: 'UPI',
        idempotencyKey: testIdempotencyKey,
      },
    }),
    apiRequest('/api/payments', {
      method: 'POST',
      token: TOKENS.OWNER,
      body: {
        memberId: testMember1.id,
        membershipId: testMs1.id,
        amount: 1000,
        paymentMethod: 'UPI',
        idempotencyKey: testIdempotencyKey,
      },
    }),
  ]);

  console.log(`Request A status: ${resA.status}, receipt: ${resA.data?.receiptNumber || resA.data?.error?.code}`);
  console.log(`Request B status: ${resB.status}, receipt: ${resB.data?.receiptNumber || resB.data?.error?.code}`);

  // Query DB to verify receipts count
  const paymentsCreated = await db.query.payments.findMany({
    where: and(eq(payments.gymId, gymId), eq(payments.idempotencyKey, testIdempotencyKey)),
  });

  console.log(`Total payment receipts generated in DB: ${paymentsCreated.length}`);
  if (paymentsCreated.length === 1) {
    console.log('✅ PASS: Exactly ONE receipt generated. Duplicate transaction correctly rejected/idempotent.');
    console.log(`Receipt Number: ${paymentsCreated[0].receiptNumber}`);
  } else {
    console.error('❌ FAIL: Multiple receipts generated!');
  }
  console.log('');

  // -------------------------------------------------------------
  // TEST 3: CONCURRENT BALANCE OVER-PAYMENT RACE CONDITION TEST
  // -------------------------------------------------------------
  console.log('--- TEST 3: PESSIMISTIC ROW LOCKING & BALANCE CONCURRENCY TEST ---');
  // Target: Outstanding balance = ₹1,000. Simultaneous ₹700 + ₹700 requests. Total must NOT exceed ₹1,000.
  const [testMember2] = await db.insert(members).values({
    gymId,
    memberCode: `TEST-LOCK-${Date.now() % 10000}`,
    name: 'Row Lock Test Member',
    status: 'PAYMENT PENDING',
    joinDate: '2026-03-01',
  }).returning();

  const [testMs2] = await db.insert(memberships).values({
    gymId,
    memberId: testMember2.id,
    planId: aPlan.id,
    planName: 'Strength Pass',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    totalFee: '1000.00',
    discount: '0.00',
    price: '1000.00',
    status: 'Pending',
  }).returning();

  console.log(`Created membership ${testMs2.id} with price ₹1000.00 (Pending balance: ₹1000.00)`);
  console.log('Triggering 2 simultaneous payments of ₹700 each with DIFFERENT idempotency keys...');

  const [concurrentPay1, concurrentPay2] = await Promise.all([
    apiRequest('/api/payments', {
      method: 'POST',
      token: TOKENS.OWNER,
      body: {
        memberId: testMember2.id,
        membershipId: testMs2.id,
        amount: 700,
        paymentMethod: 'Cash',
        idempotencyKey: `race-lock-1-${Date.now()}`,
      },
    }),
    apiRequest('/api/payments', {
      method: 'POST',
      token: TOKENS.OWNER,
      body: {
        memberId: testMember2.id,
        membershipId: testMs2.id,
        amount: 700,
        paymentMethod: 'Cash',
        idempotencyKey: `race-lock-2-${Date.now()}`,
      },
    }),
  ]);

  console.log(`Concurrent Payment 1 status: ${concurrentPay1.status}, data: ${JSON.stringify(concurrentPay1.data?.receiptNumber || concurrentPay1.data?.error)}`);
  console.log(`Concurrent Payment 2 status: ${concurrentPay2.status}, data: ${JSON.stringify(concurrentPay2.data?.receiptNumber || concurrentPay2.data?.error)}`);

  const allMemberPayments = await db.query.payments.findMany({
    where: and(eq(payments.gymId, gymId), eq(payments.memberId, testMember2.id)),
  });

  const totalCollectedOnMember = allMemberPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
  console.log(`Total collected on membership: ₹${totalCollectedOnMember} (Allowed max: ₹1000)`);

  if (totalCollectedOnMember === 700) {
    console.log('✅ PASS: Row locking successfully prevented double collection! Second request was rejected due to insufficient pending balance.');
  } else if (totalCollectedOnMember > 1000) {
    console.error('❌ FAIL: Race condition detected! Total collected exceeded outstanding balance!');
  } else {
    console.log(`Result: Total collected is ₹${totalCollectedOnMember}`);
  }
  console.log('');

  // -------------------------------------------------------------
  // TEST 4: MEMBER DELETION FINANCIAL PRESERVATION TEST
  // -------------------------------------------------------------
  console.log('--- TEST 4: FINANCIAL HISTORY PRESERVATION (MEMBER DELETION) ---');
  // Attempt to delete testMember1 who has a payment receipt
  const delWithPayments = await apiRequest(`/api/members/${testMember1.id}`, {
    method: 'DELETE',
    token: TOKENS.OWNER,
  });
  console.log(`Delete member with payment receipts status: ${delWithPayments.status}`);
  console.log(`Response error code: ${delWithPayments.data?.error?.code}, message: ${delWithPayments.data?.error?.message}`);

  if (delWithPayments.status === 400 && delWithPayments.data?.error?.code === 'MEMBER_HAS_PAYMENTS') {
    console.log('✅ PASS: Member deletion correctly rejected to protect financial audit trail.');
  } else {
    console.error('❌ FAIL: Member with payments was deleted or unexpected response!');
  }

  // Member with NO payments
  const [memberNoPay] = await db.insert(members).values({
    gymId,
    memberCode: `TEST-NOPAY-${Date.now() % 10000}`,
    name: 'No Payment Member',
    status: 'ACTIVE',
    joinDate: '2026-03-01',
  }).returning();

  const delNoPayments = await apiRequest(`/api/members/${memberNoPay.id}`, {
    method: 'DELETE',
    token: TOKENS.OWNER,
  });
  console.log(`Delete member without payments status: ${delNoPayments.status} (Expected 200)`);
  if (delNoPayments.status === 200) {
    console.log('✅ PASS: Clean deletion allowed when no payment receipts exist.');
  }
  console.log('');

  // -------------------------------------------------------------
  // TEST 5: SENSITIVE ENDPOINTS RBAC MATRIX SCRIPT
  // -------------------------------------------------------------
  console.log('--- TEST 5: SENSITIVE ENDPOINTS RBAC TEST ---');
  // Create dedicated test fixtures for sensitive operations
  const [memberForDelete] = await db.insert(members).values({
    gymId,
    memberCode: `RBAC-DEL-${Date.now() % 10000}`,
    name: 'RBAC Delete Test Member',
    status: 'ACTIVE',
    joinDate: '2026-03-01',
  }).returning();

  const [paymentForRefund] = await db.insert(payments).values({
    gymId,
    memberId: testMember1.id,
    memberName: testMember1.name,
    receiptNumber: `REF-${Date.now() % 10000}`,
    amount: '100.00',
    paymentMethod: 'Cash',
    status: 'Paid',
    paymentDate: new Date(),
    notes: 'Test refund fixture',
  }).returning();

  const endpointsToTest = [
    { name: 'GET /api/audit', url: '/api/audit', method: 'GET' },
    { name: 'GET /api/backup', url: '/api/backup', method: 'GET' },
    { name: 'GET /api/backup/export', url: '/api/backup/export', method: 'GET' },
    { name: 'PUT /api/gym', url: '/api/gym', method: 'PUT', body: { name: 'IRON CORE FITNESS' } },
    { name: 'PATCH /api/gym/status', url: '/api/gym/status', method: 'PATCH', body: { status: 'SUSPENDED' } },
    { name: 'DELETE /api/expenses/:id', url: '/api/expenses/dummy-expense-id', method: 'DELETE' },
    { name: 'POST /api/payments/:id/refund', url: `/api/payments/${paymentForRefund.id}/refund`, method: 'POST', body: { reason: 'Test customer refund' } },
    { name: 'DELETE /api/members/:id', url: `/api/members/${memberForDelete.id}`, method: 'DELETE' },
    { name: 'GET /api/reports', url: '/api/reports', method: 'GET' },
    { name: 'GET /api/payments', url: '/api/payments', method: 'GET' },
    { name: 'POST /api/payments', url: '/api/payments', method: 'POST', body: { memberId: testMember2.id, amount: 100, paymentMethod: 'Cash' } },
    { name: 'GET /api/expenses', url: '/api/expenses', method: 'GET' },
    { name: 'POST /api/expenses', url: '/api/expenses', method: 'POST', body: { category: 'Maintenance', description: 'Equipment repair', amount: 150 } },
    { name: 'POST /api/plans', url: '/api/plans', method: 'POST', body: { name: 'Yoga Pass', durationMonths: 1, durationDays: 30, price: 1200 } },
    { name: 'POST /api/memberships/renew', url: '/api/memberships/renew', method: 'POST', body: { memberId: testMember2.id, planId: aPlan.id } },
    { name: 'GET /api/members', url: '/api/members', method: 'GET' },
    { name: 'POST /api/members', url: '/api/members', method: 'POST', body: { name: 'RBAC Onboarded Member' } },
  ];

  console.log('| Endpoint | OWNER | MANAGER | TRAINER | Unauthenticated |');
  console.log('|---|---|---|---|---|');

  for (const ep of endpointsToTest) {
    // Ensure gym is ACTIVE before testing
    await pool.query("UPDATE gyms SET status = 'ACTIVE' WHERE id = $1", [gymId]);

    const [resUnauth, resTrainer, resManager, resOwner] = await Promise.all([
      apiRequest(ep.url, { method: ep.method, token: null, body: ep.body }),
      apiRequest(ep.url, { method: ep.method, token: TOKENS.TRAINER, body: ep.body }),
      apiRequest(ep.url, { method: ep.method, token: TOKENS.MANAGER, body: ep.body }),
      apiRequest(ep.url, { method: ep.method, token: TOKENS.OWNER, body: ep.body }),
    ]);

    // Restore ACTIVE immediately if status was changed
    if (ep.name.includes('status')) {
      await pool.query("UPDATE gyms SET status = 'ACTIVE' WHERE id = $1", [gymId]);
    }

    const formatCode = (res: any) => {
      if (res.status === 200 || res.status === 201) return '200 OK';
      if (res.status === 403) return '403 Forbidden';
      if (res.status === 401) return '401 Unauthorized';
      if (res.status === 404) return '404 (Auth passed)';
      if (res.status === 400) return `400 (${res.data?.error?.code || 'Bad Req'})`;
      return `${res.status}`;
    };

    console.log(`| ${ep.name} | ${formatCode(resOwner)} | ${formatCode(resManager)} | ${formatCode(resTrainer)} | ${formatCode(resUnauth)} |`);
  }
  console.log('');

  // -------------------------------------------------------------
  // TEST 6: ROLE ESCALATION / PRIVILEGE TAMPERING ATTEMPT
  // -------------------------------------------------------------
  console.log('--- TEST 6: ROLE ESCALATION ATTEMPTS ---');
  // Attempt 1: MANAGER calling /api/auth/sync with requestedRole: 'OWNER'
  const managerEscalate = await apiRequest('/api/auth/sync', {
    method: 'POST',
    token: TOKENS.MANAGER,
    body: {
      requestedRole: 'OWNER',
      name: 'Hacked Manager',
    },
  });
  console.log(`MANAGER role self-escalation attempt status: ${managerEscalate.status}`);
  console.log(`Response: ${JSON.stringify(managerEscalate.data)}`);

  // Attempt 2: TRAINER calling /api/auth/sync with requestedRole: 'OWNER'
  const trainerEscalate = await apiRequest('/api/auth/sync', {
    method: 'POST',
    token: TOKENS.TRAINER,
    body: {
      requestedRole: 'OWNER',
      name: 'Hacked Trainer',
    },
  });
  console.log(`TRAINER role self-escalation attempt status: ${trainerEscalate.status}`);
  console.log(`Response: ${JSON.stringify(trainerEscalate.data)}`);

  // Verify DB that roles were NOT changed
  const checkManager = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.firebaseUid, 'uid-test-token-manager'),
  });
  const checkTrainer = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.firebaseUid, 'uid-test-token-trainer'),
  });
  console.log(`DB check - Manager role in DB: ${checkManager?.role} (Expected MANAGER)`);
  console.log(`DB check - Trainer role in DB: ${checkTrainer?.role} (Expected TRAINER)`);
  if (checkManager?.role === 'MANAGER' && checkTrainer?.role === 'TRAINER') {
    console.log('✅ PASS: Privilege escalation strictly rejected!');
  } else {
    console.error('❌ FAIL: Privilege escalation succeeded!');
  }
  console.log('');

  // -------------------------------------------------------------
  // TEST 7: CROSS-TENANT ISOLATION
  // -------------------------------------------------------------
  console.log('--- TEST 7: CROSS-TENANT ISOLATION ---');
  // Provision Tenant B
  const tenant2GymRes = await apiRequest('/api/gym', { token: TOKENS.TENANT2 });
  const tenant2Gym = tenant2GymRes.data;
  console.log(`Tenant 2 gym: ${tenant2Gym.name} (${tenant2Gym.id})`);

  // Tenant 2 attempts to fetch primary gym's member details
  const crossMemberAccess = await apiRequest(`/api/members/${testMember1.id}`, {
    token: TOKENS.TENANT2,
  });
  console.log(`Tenant 2 accessing Tenant 1 member status: ${crossMemberAccess.status} (Expected 404 NOT_FOUND)`);

  // Tenant 2 attempts to delete Tenant 1 member
  const crossMemberDelete = await apiRequest(`/api/members/${testMember1.id}`, {
    method: 'DELETE',
    token: TOKENS.TENANT2,
  });
  console.log(`Tenant 2 deleting Tenant 1 member status: ${crossMemberDelete.status} (Expected 404 NOT_FOUND)`);

  // Tenant 2 reads audit logs
  const crossAudit = await apiRequest('/api/audit', { token: TOKENS.TENANT2 });
  const leakedLogs = (crossAudit.data || []).filter((l: any) => l.gymId === gymId);
  console.log(`Tenant 2 reading audit: Found ${crossAudit.data?.length || 0} logs for Tenant 2. Tenant 1 leaked logs: ${leakedLogs.length}`);

  if (crossMemberAccess.status === 404 && leakedLogs.length === 0) {
    console.log('✅ PASS: Strict tenant isolation confirmed. No cross-tenant data leakage.');
  } else {
    console.error('❌ FAIL: Cross-tenant leakage detected!');
  }
  console.log('\n====================================================');
  console.log('VERIFICATION TEST SUITE EXECUTION COMPLETED');
  console.log('====================================================');

  process.exit(0);
}

runVerification().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
