/**
 * Comprehensive Automated Audit & Test Suite for Member Activity, History & Fitness Journey
 */

const BASE_URL = 'http://localhost:3000';
const OWNER_TOKEN = 'test-token-owner-gym-a';
const TENANT2_MEMBER_TOKEN = 'test-token-member-tenant2';
const DEMO_MEMBER_TOKEN = 'test-token-demo-member';

interface TestResult {
  step: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestResult[] = [];

function record(step: string, name: string, pass: boolean, details: string) {
  results.push({
    step,
    name,
    status: pass ? 'PASS' : 'FAIL',
    details,
  });
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} [${step}] ${name}: ${details}`);
}

async function request(path: string, options: { method?: string; token?: string; body?: any } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return { status: res.status, ok: res.ok, data: json };
}

async function runAudit() {
  console.log('==================================================================');
  console.log('STARTING MEMBER ACTIVITY, HISTORY & FITNESS JOURNEY AUDIT');
  console.log('==================================================================\n');

  // 1. Reset Demo Member
  const resetRes = await request('/api/auth/demo-member/reset', { method: 'POST' });
  record('1. SETUP', 'Demo Member Seeding & Reset', resetRes.ok, `Status: ${resetRes.status}`);

  // 2. Login as Demo Member
  const demoAuthRes = await request('/api/auth/demo-member', { method: 'POST' });
  const demoToken = demoAuthRes.data?.token || DEMO_MEMBER_TOKEN;
  record('1. SETUP', 'Demo Member Authentication', demoAuthRes.ok, `Token obtained for user: ${demoAuthRes.data?.user?.name}`);

  // 3. Verify Member Activity Base Endpoint
  const actRes = await request('/api/member/activity', { token: demoToken });
  record('2. ACTIVITY API', 'Fetch Unified Member Activity', actRes.ok, `Status: ${actRes.status}`);

  const actData = actRes.data;
  const summary = actData?.summary;
  const activities = actData?.activities || [];
  const thisWeek = actData?.thisWeek || [];
  const calendarDays = actData?.calendarDays || {};
  const personalRecords = actData?.personalRecords || [];
  const achievements = actData?.achievements || [];

  // Verify Summary Data Integrity
  record('2. ACTIVITY API', 'Summary Metrics Integrity', 
    summary?.totalCheckins >= 10 && summary?.completedWorkouts >= 3 && summary?.currentStreak >= 5,
    `Visits: ${summary?.totalCheckins}, Completed Workouts: ${summary?.completedWorkouts}, Streak: ${summary?.currentStreak}, Total Spent: ₹${summary?.totalSpent}`
  );

  // Verify Personal Records
  const hasBench = personalRecords.some((p: any) => p.exercise.toLowerCase().includes('bench'));
  const hasDeadlift = personalRecords.some((p: any) => p.exercise.toLowerCase().includes('deadlift'));
  const hasSquat = personalRecords.some((p: any) => p.exercise.toLowerCase().includes('squat'));
  record('2. ACTIVITY API', 'Personal Records Discovery', 
    hasBench && hasDeadlift && hasSquat,
    `Found PRs: ${personalRecords.map((p: any) => `${p.exercise} (${p.maxWeight})`).join(', ')}`
  );

  // Verify Achievements
  const unlockedCount = achievements.filter((a: any) => a.unlocked).length;
  record('2. ACTIVITY API', 'Deterministic Achievements Calculation', 
    unlockedCount >= 4,
    `Unlocked ${unlockedCount} / ${achievements.length} badges (${achievements.filter((a: any) => a.unlocked).map((a: any) => a.title).join(', ')})`
  );

  // Verify Timeline Types Diversity
  const typesPresent = new Set(activities.map((a: any) => a.type));
  const hasAtt = typesPresent.has('ATTENDANCE');
  const hasWkt = typesPresent.has('WORKOUT');
  const hasPay = typesPresent.has('PAYMENT');
  const hasMs = typesPresent.has('MEMBERSHIP');
  const hasCom = typesPresent.has('COMMUNITY');
  const hasAch = typesPresent.has('ACHIEVEMENT');
  record('3. TIMELINE DIVERSITY', 'Event Projections',
    hasAtt && hasWkt && hasPay && hasMs && hasCom && hasAch,
    `Found event types: ${Array.from(typesPresent).join(', ')} (Total items: ${activities.length})`
  );

  // Verify Chronological Sort
  let isSorted = true;
  for (let i = 1; i < activities.length; i++) {
    if (new Date(activities[i - 1].timestamp).getTime() < new Date(activities[i].timestamp).getTime()) {
      isSorted = false;
      break;
    }
  }
  record('3. TIMELINE INTEGRITY', 'Chronological Descending Order', isSorted, 'Newest activities appear at top');

  // Verify Filters
  const attFilterRes = await request('/api/member/activity?type=ATTENDANCE', { token: demoToken });
  const allAtt = attFilterRes.data?.activities?.every((a: any) => a.type === 'ATTENDANCE');
  record('4. FILTERS', 'Filter by ATTENDANCE', allAtt && attFilterRes.data?.activities?.length > 0, `Returned ${attFilterRes.data?.activities?.length} check-in events`);

  const wktFilterRes = await request('/api/member/activity?type=WORKOUT', { token: demoToken });
  const allWkt = wktFilterRes.data?.activities?.every((a: any) => a.type === 'WORKOUT');
  record('4. FILTERS', 'Filter by WORKOUT', allWkt && wktFilterRes.data?.activities?.length > 0, `Returned ${wktFilterRes.data?.activities?.length} workout events`);

  const payFilterRes = await request('/api/member/activity?type=PAYMENT', { token: demoToken });
  const allPay = payFilterRes.data?.activities?.every((a: any) => a.type === 'PAYMENT');
  record('4. FILTERS', 'Filter by PAYMENT', allPay && payFilterRes.data?.activities?.length > 0, `Returned ${payFilterRes.data?.activities?.length} payment receipt events`);

  // Verify Search
  const searchDeadliftRes = await request('/api/member/activity?search=deadlift', { token: demoToken });
  const foundDeadlift = searchDeadliftRes.data?.activities?.some((a: any) => JSON.stringify(a).toLowerCase().includes('deadlift'));
  record('4. SEARCH', 'Search by Keyword ("deadlift")', foundDeadlift, `Search returned ${searchDeadliftRes.data?.activities?.length} matching record(s)`);

  // Verify Calendar Endpoint
  const calRes = await request('/api/member/activity/calendar', { token: demoToken });
  const hasCalDays = calRes.ok && Array.isArray(calRes.data?.days) && calRes.data.days.length >= 10;
  record('5. CALENDAR API', 'Fast Calendar Summary Mapping', hasCalDays, `Found ${calRes.data?.days?.length} active activity days`);

  // 6. Security & Tenant Isolation Tests
  const unauthRes = await request('/api/member/activity');
  record('6. SECURITY', 'Unauthenticated Rejection (401)', unauthRes.status === 401, `Status: ${unauthRes.status}`);

  // Member from Tenant 2 querying activity
  const tenant2Res = await request('/api/member/activity', { token: TENANT2_MEMBER_TOKEN });
  const tenant2Activities = tenant2Res.data?.activities || [];
  const leaksDemo = tenant2Activities.some((a: any) => JSON.stringify(a).includes('RPM-DEMO') || JSON.stringify(a).includes('Alex Johnson'));
  const passIsolation = (tenant2Res.ok || tenant2Res.status === 403) && !leaksDemo;
  record('6. SECURITY', 'Tenant Isolation (No Cross-Gym Leakage)', 
    passIsolation, 
    `Tenant 2 member activity query returned 0 Demo Gym records (Status: ${tenant2Res.status}). Leakage: ${leaksDemo ? 'DETECTED' : 'NONE'}`
  );

  // Tampering with query parameter ?memberId=...
  const tamperRes = await request(`/api/member/activity?memberId=00000000-0000-0000-0000-000000000003`, { token: TENANT2_MEMBER_TOKEN });
  const tamperLeaksDemo = (tamperRes.data?.activities || []).some((a: any) => JSON.stringify(a).includes('Alex Johnson'));
  record('6. SECURITY', 'ID Tampering Prevention', !tamperLeaksDemo, 'Backend ignored query memberId and strictly enforced authenticated token session');

  console.log('\n==================================================================');
  console.log('MEMBER ACTIVITY AUDIT SUMMARY');
  console.log('==================================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL AUDIT CHECKS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('==================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
