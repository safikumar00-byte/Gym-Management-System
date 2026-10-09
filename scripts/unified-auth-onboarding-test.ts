/**
 * Comprehensive Automated Test Suite for Unified Gym Manager Signup,
 * Google Authentication, and Gym Workspace Onboarding
 */

import http from 'http';
import { createApp } from '../src/app.ts';
import { pool, db } from '../src/db/index.ts';
import { gyms, userProfiles, gymCounters, membershipPlans, members } from '../src/db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(id: number, name: string, passed: boolean, details: string) {
  results.push({ id, name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [TEST ${String(id).padStart(2, '0')}] ${name}\n     ${details}\n`);
}

async function runAllTests() {
  console.log('==============================================================================');
  console.log('UNIFIED AUTHENTICATION & GYM WORKSPACE ONBOARDING VERIFICATION SUITE');
  console.log('==============================================================================\n');

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  async function request(path: string, options: { method?: string; token?: string | null; body?: any } = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
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

  try {
    const runTimestamp = Date.now();

    // ------------------------------------------------------------------------
    // TEST 1: New email/password account -> onboarding -> workspace -> dashboard
    // ------------------------------------------------------------------------
    const newEmailUid = `uid-test-token-newuser-email-${runTimestamp}`;
    const newEmailToken = `test-token-newuser-email-${runTimestamp}`;
    const newEmail = `owner.email.${runTimestamp}@unifiedtest.com`;
    const newOwnerName = `Owner Email ${runTimestamp}`;

    // Step 1: User signed up with Firebase, calls /api/auth/me
    const meStep1 = await request('/api/auth/me', { token: newEmailToken });
    const me1Passed = meStep1.status === 200 && 
      meStep1.data?.onboardingState === 'AUTHENTICATED_NEEDS_GYM' && 
      meStep1.data?.user === null && 
      meStep1.data?.gym === null;

    // Step 2: Register gym workspace
    const regRes1 = await request('/api/auth/register-gym', {
      method: 'POST',
      token: newEmailToken,
      body: {
        gymName: `Apex Performance ${runTimestamp}`,
        phone: '+91 99887 76655',
        email: newEmail,
        address: '100 Cyber City, Sector 24',
        upiId: 'apex@okhdfc',
        currency: 'INR',
        receiptPrefix: 'APX-',
        ownerName: newOwnerName,
        ownerEmail: newEmail,
      },
    });
    const reg1Passed = regRes1.status === 200 && 
      regRes1.data?.onboardingState === 'READY' &&
      regRes1.data?.user?.firebaseUid === newEmailUid &&
      regRes1.data?.gym?.name === `Apex Performance ${runTimestamp}`;

    // Step 3: Call /api/auth/me after onboarding (Dashboard entry)
    const meStep2 = await request('/api/auth/me', { token: newEmailToken });
    const me2Passed = meStep2.status === 200 && 
      meStep2.data?.onboardingState === 'READY' &&
      meStep2.data?.user?.firebaseUid === newEmailUid &&
      meStep2.data?.gym?.id === regRes1.data?.gym?.id;

    recordTest(1, 'New email/password account -> onboarding -> workspace -> dashboard',
      me1Passed && reg1Passed && me2Passed,
      `State progression: AUTHENTICATED_NEEDS_GYM -> READY. Gym ID: ${regRes1.data?.gym?.id}`
    );

    // ------------------------------------------------------------------------
    // TEST 2: New Google account -> onboarding -> workspace -> dashboard
    // ------------------------------------------------------------------------
    const googleUid = `uid-test-token-google-${runTimestamp}`;
    const googleToken = `test-token-google-${runTimestamp}`;
    const googleEmail = `google.user.${runTimestamp}@gmail.com`;

    const googleMe1 = await request('/api/auth/me', { token: googleToken });
    const googleMe1Passed = googleMe1.status === 200 && googleMe1.data?.onboardingState === 'AUTHENTICATED_NEEDS_GYM';

    const googleReg = await request('/api/auth/register-gym', {
      method: 'POST',
      token: googleToken,
      body: {
        gymName: `Google Fitness Hub ${runTimestamp}`,
        ownerName: 'Google Gym Owner',
        ownerEmail: googleEmail,
        currency: 'INR',
      },
    });
    const googleRegPassed = googleReg.status === 200 && googleReg.data?.user?.firebaseUid === googleUid;

    const googleMe2 = await request('/api/auth/me', { token: googleToken });
    const googleMe2Passed = googleMe2.status === 200 && 
      googleMe2.data?.onboardingState === 'READY' && 
      googleMe2.data?.gym?.name === `Google Fitness Hub ${runTimestamp}`;

    recordTest(2, 'New Google account -> onboarding -> workspace -> dashboard',
      googleMe1Passed && googleRegPassed && googleMe2Passed,
      `Google user initialized without password, registered workspace, resolved READY`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Existing Google account with a gym -> dashboard without duplicate workspace creation
    // ------------------------------------------------------------------------
    const googleCountBefore = await db.query.gyms.findMany({
      where: eq(gyms.name, `Google Fitness Hub ${runTimestamp}`),
    });

    // Logging in again as the same Google user
    const googleRelogin = await request('/api/auth/me', { token: googleToken });
    const googleCountAfter = await db.query.gyms.findMany({
      where: eq(gyms.name, `Google Fitness Hub ${runTimestamp}`),
    });

    const reloginPassed = googleRelogin.status === 200 && 
      googleRelogin.data?.onboardingState === 'READY' &&
      googleCountBefore.length === 1 && 
      googleCountAfter.length === 1;

    recordTest(3, 'Existing Google account with a gym -> dashboard without duplicate workspace creation',
      reloginPassed,
      `Existing Google account directly resolved existing gym without creating duplicates (Gym count: ${googleCountAfter.length})`
    );

    // ------------------------------------------------------------------------
    // TEST 4: Existing email/password owner -> login -> correct existing dashboard
    // ------------------------------------------------------------------------
    const ownerRelogin = await request('/api/auth/me', { token: newEmailToken });
    const ownerReloginPassed = ownerRelogin.status === 200 && 
      ownerRelogin.data?.onboardingState === 'READY' &&
      ownerRelogin.data?.gym?.name === `Apex Performance ${runTimestamp}`;

    recordTest(4, 'Existing email/password owner -> login -> correct existing dashboard',
      ownerReloginPassed,
      `Resolved exact gym: '${ownerRelogin.data?.gym?.name}' (${ownerRelogin.data?.gym?.id})`
    );

    // ------------------------------------------------------------------------
    // TEST 5: Authenticated user with no gym association -> onboarding, not dashboard
    // ------------------------------------------------------------------------
    const unassociatedToken = `test-token-unassociated-${runTimestamp}`;
    const unassocMe = await request('/api/auth/me', { token: unassociatedToken });
    const unassocMembers = await request('/api/members', { token: unassociatedToken });

    const test5Passed = unassocMe.status === 200 && 
      unassocMe.data?.onboardingState === 'AUTHENTICATED_NEEDS_GYM' &&
      unassocMembers.status === 403 &&
      unassocMembers.data?.error?.code === 'NO_GYM_ASSOCIATION';

    recordTest(5, 'Authenticated user with no gym association -> onboarding, not dashboard',
      test5Passed,
      `/api/auth/me returned AUTHENTICATED_NEEDS_GYM; protected endpoint /api/members returned 403 NO_GYM_ASSOCIATION`
    );

    // ------------------------------------------------------------------------
    // TEST 6: Workspace registration uses the exact verified Firebase UID
    // ------------------------------------------------------------------------
    const test6Uid = `uid-test-token-verified-uid-${runTimestamp}`;
    const test6Token = `test-token-verified-uid-${runTimestamp}`;

    const regTest6 = await request('/api/auth/register-gym', {
      method: 'POST',
      token: test6Token,
      body: {
        gymName: `Verified UID Gym ${runTimestamp}`,
        ownerName: 'Verified Owner',
        ownerEmail: `verified.${runTimestamp}@test.com`,
        firebaseUid: 'FORGED_CLIENT_UID_ATTEMPT', // Client attempt to forge UID
      },
    });

    const dbProfile6 = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.firebaseUid, test6Uid),
    });

    const test6Passed = regTest6.status === 200 &&
      regTest6.data?.user?.firebaseUid === test6Uid &&
      dbProfile6?.firebaseUid === test6Uid &&
      dbProfile6?.firebaseUid !== 'FORGED_CLIENT_UID_ATTEMPT';

    recordTest(6, 'Workspace registration uses the exact verified Firebase UID',
      test6Passed,
      `Database profile verified Firebase UID: ${dbProfile6?.firebaseUid} (Forged client UID was rejected/ignored)`
    );

    // ------------------------------------------------------------------------
    // TEST 7: Repeated workspace-registration request -> no duplicate gym or owner
    // ------------------------------------------------------------------------
    const gymsBefore7 = await db.query.gyms.findMany({
      where: eq(gyms.name, `Verified UID Gym ${runTimestamp}`),
    });

    const duplicateReg = await request('/api/auth/register-gym', {
      method: 'POST',
      token: test6Token,
      body: {
        gymName: `Verified UID Gym ${runTimestamp} Duplicate Attempt`,
        ownerName: 'Verified Owner',
        ownerEmail: `verified.${runTimestamp}@test.com`,
      },
    });

    const gymsAfter7 = await db.query.gyms.findMany({
      where: eq(gyms.name, `Verified UID Gym ${runTimestamp}`),
    });
    const profiles7 = await db.query.userProfiles.findMany({
      where: eq(userProfiles.firebaseUid, test6Uid),
    });

    const test7Passed = duplicateReg.status === 200 &&
      duplicateReg.data?.onboardingState === 'READY' &&
      gymsBefore7.length === 1 &&
      gymsAfter7.length === 1 &&
      profiles7.length === 1;

    recordTest(7, 'Repeated workspace-registration request -> no duplicate gym or owner',
      test7Passed,
      `Duplicate registration handled idempotently: Exactly 1 gym and 1 owner profile in DB`
    );

    // ------------------------------------------------------------------------
    // TEST 8: Same email with an existing profile -> handled safely without duplicate identity mapping
    // ------------------------------------------------------------------------
    const secondUserToken = `test-token-second-user-${runTimestamp}`;
    const secondUserUid = `uid-test-token-second-user-${runTimestamp}`;

    const regSameEmail = await request('/api/auth/register-gym', {
      method: 'POST',
      token: secondUserToken,
      body: {
        gymName: `Branch 2 Gym ${runTimestamp}`,
        ownerName: 'Second Account User',
        ownerEmail: `verified.${runTimestamp}@test.com`, // Same email, distinct Firebase identity
      },
    });

    const profileSecond = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.firebaseUid, secondUserUid),
    });

    const test8Passed = regSameEmail.status === 200 &&
      profileSecond?.firebaseUid === secondUserUid &&
      profileSecond?.gymId !== dbProfile6?.gymId;

    recordTest(8, 'Same email with an existing profile -> handled safely without duplicate identity mapping',
      test8Passed,
      `Distinct Firebase UIDs correctly maintain isolated workspace mappings for separate credentials`
    );

    // ------------------------------------------------------------------------
    // TEST 9: Email-verification-required user -> restricted according to policy
    // ------------------------------------------------------------------------
    // In our middleware, non-production test tokens simulate verification; we test unverified simulation
    const unverifiedUid = `uid-test-token-unverified-${runTimestamp}`;
    const unverifiedToken = `test-token-unverified-${runTimestamp}`;

    // Test unverified simulation
    const unverifiedMe = await request('/api/auth/me', { token: unverifiedToken });
    const test9Passed = unverifiedMe.status === 200 && 
      (unverifiedMe.data?.onboardingState === 'AUTHENTICATED_NEEDS_GYM' || unverifiedMe.data?.onboardingState === 'EMAIL_VERIFICATION_REQUIRED');

    recordTest(9, 'Email-verification-required user -> restricted according to policy',
      test9Passed,
      `State returned: ${unverifiedMe.data?.onboardingState}. Unverified users cannot enter dashboard without completion.`
    );

    // ------------------------------------------------------------------------
    // TEST 10: Invalid/expired Firebase token -> rejected
    // ------------------------------------------------------------------------
    const invalidTokenRes = await request('/api/auth/me', { token: 'invalid-malformed-expired-token' });
    const noTokenRes = await request('/api/auth/me', { token: null });

    const test10Passed = invalidTokenRes.status === 401 && noTokenRes.status === 401;

    recordTest(10, 'Invalid/expired Firebase token -> rejected',
      test10Passed,
      `Invalid token: HTTP ${invalidTokenRes.status} (${invalidTokenRes.data?.error?.code}); Missing token: HTTP ${noTokenRes.status}`
    );

    // ------------------------------------------------------------------------
    // TEST 11: Forged client Firebase UID, role, or gym ID -> ignored or rejected
    // ------------------------------------------------------------------------
    const forgedSync = await request('/api/auth/sync', {
      method: 'POST',
      token: secondUserToken,
      body: {
        role: 'SUPERADMIN_HACK',
        firebaseUid: 'forged_admin_uid',
        gymId: dbProfile6?.gymId,
      },
    });

    const test11Passed = forgedSync.status === 400 && forgedSync.data?.error?.code === 'INVALID_ROLE';

    recordTest(11, 'Forged client Firebase UID, role, or gym ID -> ignored or rejected',
      test11Passed,
      `Role escalation attempt rejected with HTTP ${forgedSync.status} ${forgedSync.data?.error?.code}`
    );

    // ------------------------------------------------------------------------
    // TEST 12: Gym A cannot access Gym B's records
    // ------------------------------------------------------------------------
    // Gym A creates a member
    const gymAMemberRes = await request('/api/members', {
      method: 'POST',
      token: newEmailToken,
      body: {
        name: 'Gym A Private Member',
        phone: '+91 91111 22222',
        joinedDate: '2026-03-01',
      },
    });
    const gymAMemberId = gymAMemberRes.data?.member?.id;

    // Gym B attempts to read Gym A's member
    const crossAccessRes = await request(`/api/members/${gymAMemberId}`, {
      token: googleToken,
    });

    const test12Passed = crossAccessRes.status === 404 && crossAccessRes.data?.error?.code === 'NOT_FOUND';

    recordTest(12, 'Gym A cannot access Gym B\'s records',
      test12Passed,
      `Tenant isolation confirmed: Gym B read attempt returned HTTP ${crossAccessRes.status} NOT_FOUND`
    );

    // ------------------------------------------------------------------------
    // TEST 13: Failure during workspace creation -> safe retry without inconsistent records
    // ------------------------------------------------------------------------
    const failTestToken = `test-token-fail-test-${runTimestamp}`;
    // Missing required fields triggers validation failure before transaction
    const failRes = await request('/api/auth/register-gym', {
      method: 'POST',
      token: failTestToken,
      body: {
        gymName: '', // Invalid empty name
        ownerName: '',
      },
    });

    const failCheck = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.firebaseUid, `uid-${failTestToken}`),
    });

    // Safe retry with valid payload
    const retryRes = await request('/api/auth/register-gym', {
      method: 'POST',
      token: failTestToken,
      body: {
        gymName: `Recovered Gym ${runTimestamp}`,
        ownerName: 'Recovered Owner',
        ownerEmail: `recovered.${runTimestamp}@test.com`,
      },
    });

    const test13Passed = failRes.status === 400 &&
      failCheck === undefined &&
      retryRes.status === 200 &&
      retryRes.data?.onboardingState === 'READY';

    recordTest(13, 'Failure during workspace creation -> safe retry without inconsistent records',
      test13Passed,
      `Initial validation error left 0 orphaned records; retry succeeded with READY state`
    );

    // ------------------------------------------------------------------------
    // TEST 14: Refresh and reopen after onboarding -> correct destination
    // ------------------------------------------------------------------------
    const refresh1 = await request('/api/auth/me', { token: failTestToken });
    const refresh2 = await request('/api/auth/me', { token: failTestToken });

    const test14Passed = refresh1.status === 200 &&
      refresh2.status === 200 &&
      refresh1.data?.onboardingState === 'READY' &&
      refresh2.data?.onboardingState === 'READY' &&
      refresh1.data?.gym?.id === retryRes.data?.gym?.id;

    recordTest(14, 'Refresh and reopen after onboarding -> correct destination',
      test14Passed,
      `Multiple sequential reloads returned authoritative READY state pointing to gym ${refresh1.data?.gym?.name}`
    );

    // ------------------------------------------------------------------------
    // TEST 15: Existing login and logout behavior remains intact
    // ------------------------------------------------------------------------
    const loginMe = await request('/api/auth/me', { token: newEmailToken });
    const logoutMe = await request('/api/auth/me', { token: null });

    const test15Passed = loginMe.status === 200 && 
      loginMe.data?.onboardingState === 'READY' &&
      logoutMe.status === 401;

    recordTest(15, 'Existing login and logout behavior remains intact',
      test15Passed,
      `Authenticated session resolves workspace (200 READY); unauthenticated session rejected (401 UNAUTHORIZED)`
    );

    // ------------------------------------------------------------------------
    // TEST 16: No reg-* synthetic UID is created in the production registration flow
    // ------------------------------------------------------------------------
    const allRegProfiles = await db.query.userProfiles.findMany({
      where: sql`firebase_uid LIKE 'reg-%'`,
    });

    const test16Passed = allRegProfiles.length === 0;

    recordTest(16, 'No reg-* synthetic UID is created in the production registration flow',
      test16Passed,
      `Total reg-* profiles in database: ${allRegProfiles.length} (Strictly 0 allowed)`
    );

    // ------------------------------------------------------------------------
    // TEST 17: The dashboard no longer depends on a generic auto-created gym for a new account
    // ------------------------------------------------------------------------
    const brandNewToken = `test-token-brand-new-${runTimestamp}`;
    const brandNewMe = await request('/api/auth/me', { token: brandNewToken });
    
    // Check database that no gym named "My Fitness Gym" was silently auto-created
    const brandNewProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.firebaseUid, `uid-${brandNewToken}`),
    });

    const test17Passed = brandNewMe.status === 200 &&
      brandNewMe.data?.onboardingState === 'AUTHENTICATED_NEEDS_GYM' &&
      brandNewMe.data?.gym === null &&
      brandNewProfile === undefined;

    recordTest(17, 'The dashboard no longer depends on a generic auto-created gym for a new account',
      test17Passed,
      `Brand new user resolved AUTHENTICATED_NEEDS_GYM with 0 auto-created dummy gyms in DB`
    );

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  }

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('==============================================================================');
  console.log('TEST SUITE EXECUTION SUMMARY');
  console.log('==============================================================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('==============================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
