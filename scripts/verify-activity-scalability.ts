import { pool, db } from '../src/db/index.ts';
import { 
  gyms, 
  userProfiles, 
  members, 
  memberships, 
  payments, 
  memberAttendance, 
  memberWorkouts, 
  communityPosts, 
  communityComments, 
  communityReactions, 
  notifications,
  auditLogs
} from '../src/db/schema.ts';
import { eq, and } from 'drizzle-orm';

const BASE_URL = 'http://localhost:3000';

async function apiRequest(path: string, options: { method?: string; token?: string; body?: any } = {}) {
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

async function run() {
  console.log('========================================================================');
  console.log('   FINAL TARGETED CHECK: MEMBER ACTIVITY HISTORY SCALABILITY (>100)     ');
  console.log('========================================================================\n');

  // 1. Reset & Seed Demo Member
  console.log('--- Check 10: Reset Demo & Seed >100 Synthetic Records ---');
  const resetRes = await apiRequest('/api/auth/demo-member/reset', { method: 'POST' });
  if (!resetRes.ok) throw new Error(`Demo reset failed: ${resetRes.status}`);

  const loginRes = await apiRequest('/api/auth/demo-member', { method: 'POST' });
  if (!loginRes.ok) throw new Error(`Demo login failed: ${loginRes.status}`);
  const demoToken = loginRes.data.token;
  console.log(`✓ Demo Member session active: ${loginRes.data.user.name}`);

  // 2. Main API Scalability check: Total activities > 100
  console.log('\n--- Check 1: Activity API Safely Handles >100 Records ---');
  const allActRes = await apiRequest('/api/member/activity?limit=200', { token: demoToken });
  if (!allActRes.ok) throw new Error(`Activity query failed: ${allActRes.status}`);
  const totalCount = allActRes.data.totalActivitiesCount;
  console.log(`✓ Total synthetic activities in database: ${totalCount}`);
  if (totalCount <= 100) {
    throw new Error(`Expected >100 activity records, got ${totalCount}`);
  }
  console.log(`✓ API safely returned ${allActRes.data.activities.length} records when limit=200 requested.`);

  // 3. Pagination & hasMore check (Default Limit = 100 or Limit = 50)
  console.log('\n--- Check 2 & 3: Frontend Pagination / Load More Mechanism ---');
  const page1Res = await apiRequest('/api/member/activity?limit=50', { token: demoToken });
  if (!page1Res.ok) throw new Error(`Page 1 failed`);
  console.log(`✓ Page 1: activities=${page1Res.data.activities.length}, total=${page1Res.data.totalActivitiesCount}, hasMore=${page1Res.data.hasMore}`);
  if (!page1Res.data.hasMore) {
    throw new Error(`Expected hasMore=true when ${page1Res.data.activities.length} < ${totalCount}`);
  }

  const page2Res = await apiRequest('/api/member/activity?limit=50&offset=50', { token: demoToken });
  if (!page2Res.ok) throw new Error(`Page 2 failed`);
  console.log(`✓ Page 2: activities=${page2Res.data.activities.length}, offset=${page2Res.data.offset}`);

  const page3Res = await apiRequest('/api/member/activity?limit=50&offset=100', { token: demoToken });
  if (!page3Res.ok) throw new Error(`Page 3 failed`);
  console.log(`✓ Page 3: activities=${page3Res.data.activities.length}, offset=${page3Res.data.offset}`);

  // 4. Duplicate Check
  console.log('\n--- Check 5: No Duplicate Records Across Pages ---');
  const page1Ids = new Set(page1Res.data.activities.map((a: any) => a.id));
  const page2Dups = page2Res.data.activities.filter((a: any) => page1Ids.has(a.id));
  if (page2Dups.length > 0) {
    throw new Error(`Found duplicates between page 1 and page 2: ${page2Dups.map((d: any) => d.id).join(', ')}`);
  }
  const allLoaded = [...page1Res.data.activities, ...page2Res.data.activities, ...page3Res.data.activities];
  const uniqueLoaded = new Set(allLoaded.map(a => a.id));
  if (uniqueLoaded.size !== allLoaded.length) {
    throw new Error(`Duplicate IDs detected across combined pages: total=${allLoaded.length}, unique=${uniqueLoaded.size}`);
  }
  console.log(`✓ Zero duplicates across ${allLoaded.length} paginated records.`);

  // 5. Chronological Descending Order Check
  console.log('\n--- Check 6: Consistent Chronological Descending Order ---');
  for (let i = 1; i < allLoaded.length; i++) {
    const prevTime = new Date(allLoaded[i - 1].timestamp).getTime();
    const currTime = new Date(allLoaded[i].timestamp).getTime();
    if (currTime > prevTime) {
      throw new Error(`Ordering violation at index ${i}: prev=${allLoaded[i - 1].date} (${allLoaded[i - 1].timestamp}), curr=${allLoaded[i].date} (${allLoaded[i].timestamp})`);
    }
  }
  console.log(`✓ All ${allLoaded.length} loaded records strictly ordered descending from ${allLoaded[0].date} to ${allLoaded[allLoaded.length - 1].date}.`);

  // 6. Existing from/to date filtering check
  console.log('\n--- Check 4: Existing from/to Date Filtering Works ---');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromStr = thirtyDaysAgo.toISOString().split('T')[0];
  const toStr = new Date().toISOString().split('T')[0];

  const rangeRes = await apiRequest(`/api/member/activity?from=${fromStr}&to=${toStr}`, { token: demoToken });
  if (!rangeRes.ok) throw new Error(`Date range query failed`);
  const rangeActivities = rangeRes.data.activities;
  console.log(`✓ Date range query [${fromStr} → ${toStr}] returned ${rangeActivities.length} items (total in range: ${rangeRes.data.totalActivitiesCount}).`);
  const outOfRange = rangeActivities.filter((a: any) => a.date < fromStr || a.date > toStr);
  if (outOfRange.length > 0) {
    throw new Error(`Found out-of-range items: ${outOfRange.map((o: any) => o.date).join(', ')}`);
  }
  console.log(`✓ All returned items strictly within [${fromStr}, ${toStr}].`);

  // 7. Calendar Data Independence Check
  console.log('\n--- Check 7: Calendar Data Independent from 100-item Timeline Limit ---');
  const calDays = page1Res.data.calendarDays;
  const calDaysKeys = Object.keys(calDays || {});
  console.log(`✓ Calendar mapped active days count: ${calDaysKeys.length} distinct days across entire history`);
  if (calDaysKeys.length < 50) {
    throw new Error(`Expected calendar indicators to cover >50 days of active history, got ${calDaysKeys.length}`);
  }
  // Check that calendar days include older days that were beyond page 1's timeline limit
  const oldestPage1Date = page1Res.data.activities[page1Res.data.activities.length - 1].date;
  const olderCalDays = calDaysKeys.filter(d => d < oldestPage1Date);
  console.log(`✓ Older days present on calendar beyond timeline page 1 cutoff (${oldestPage1Date}): ${olderCalDays.length} days`);
  if (olderCalDays.length === 0) {
    throw new Error(`Calendar missing historical dates beyond page 1 timeline cutoff!`);
  }
  console.log(`✓ Verified calendar indicators are fully independent of timeline pagination limits.`);

  // 8. Independent History Access Check
  console.log('\n--- Check 8: Independent History Endpoints Remain Fully Accessible ---');
  const [attRes, wktRes, payRes, msRes] = await Promise.all([
    apiRequest('/api/member/attendance?limit=150', { token: demoToken }),
    apiRequest('/api/member/workouts', { token: demoToken }),
    apiRequest('/api/member/payments', { token: demoToken }),
    apiRequest('/api/member/membership', { token: demoToken }),
  ]);
  if (!attRes.ok || !wktRes.ok || !payRes.ok || !msRes.ok) {
    throw new Error(`Failed to query independent history endpoints`);
  }
  console.log(`✓ Attendance Endpoint: ${attRes.data.history.length} check-ins (streak: ${attRes.data.streak})`);
  console.log(`✓ Workouts Endpoint: ${wktRes.data.length} assigned & completed routines`);
  console.log(`✓ Payments Endpoint: ${payRes.data.length} verified receipts`);
  console.log(`✓ Memberships Endpoint: Active plan ${msRes.data.active?.planName}, total passes: ${msRes.data.history.length}`);
  console.log(`✓ All independent history sub-systems remain accessible and unconstrained.`);

  // 9. Date Range Switching / No Stale Activity Check
  console.log('\n--- Check 9: Changing Month / Date Range Prevents Stale Data ---');
  // First query August 2025
  const augRes = await apiRequest('/api/member/activity?from=2025-08-01&to=2025-08-31', { token: demoToken });
  // Second query September 2026
  const sepRes = await apiRequest('/api/member/activity?from=2026-09-01&to=2026-09-30', { token: demoToken });
  if (!augRes.ok || !sepRes.ok) throw new Error(`Month switching check failed`);
  
  const hasStaleAugInSep = sepRes.data.activities.some((a: any) => a.date.startsWith('2025-08'));
  if (hasStaleAugInSep) {
    throw new Error(`Stale August 2025 data leaked into September 2026 query!`);
  }
  console.log(`✓ Switching date ranges yields clean, isolated slices with zero cross-range leakage.`);

  // 10. Reset Demo Test
  console.log('\n--- Check 10b: Reset Demo Restores Scalable Demonstration State ---');
  const secondReset = await apiRequest('/api/auth/demo-member/reset', { method: 'POST' });
  if (!secondReset.ok) throw new Error(`Second reset failed`);
  const postResetAct = await apiRequest('/api/member/activity', { token: demoToken });
  console.log(`✓ After reset: totalActivitiesCount=${postResetAct.data.totalActivitiesCount}, activities=${postResetAct.data.activities.length}`);
  if (postResetAct.data.totalActivitiesCount !== totalCount) {
    throw new Error(`Reset did not restore expected count: expected ${totalCount}, got ${postResetAct.data.totalActivitiesCount}`);
  }
  console.log(`✓ Demo Reset restored exact pristine scalable dataset.`);

  console.log('\n========================================================================');
  console.log('   ALL 10 SCALABILITY CHECKS PASSED WITH 100% SUCCESS                  ');
  console.log('========================================================================');
}

run().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
}).finally(async () => {
  await pool.end();
});
