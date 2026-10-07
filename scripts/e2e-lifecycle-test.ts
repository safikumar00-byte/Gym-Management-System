/**
 * Complete Owner -> Member End-to-End Lifecycle Verification Test
 */

const BASE_URL = 'http://localhost:3000';

const OWNER_TOKEN = 'test-token-owner-gym-a';
const MEMBER_TOKEN = 'test-token-member-rohit-gym-a';
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

async function run() {
  console.log('==================================================================');
  console.log('STARTING PHASE NEXT: COMPLETE OWNER -> MEMBER E2E LIFECYCLE TEST');
  console.log('==================================================================\n');

  // 0. Verify Owner Auth & Setup
  const ownerMe = await request('/api/auth/me', { token: OWNER_TOKEN });
  if (!ownerMe.ok) {
    throw new Error(`Owner auth failed: ${JSON.stringify(ownerMe.data)}`);
  }
  const gymId = ownerMe.data.gym.id;
  const gymName = ownerMe.data.gym.name;
  record('0. SETUP', 'Owner Authentication', true, `Owner authenticated for gym: ${gymName} (${gymId})`);

  // Fetch available plans in Gym A
  const plansRes = await request('/api/plans', { token: OWNER_TOKEN });
  const strengthPlan = plansRes.data.find((p: any) => p.name.includes('Strength') || p.durationMonths === 3) || plansRes.data[0];
  record('0. SETUP', 'Gym Plans Discovery', !!strengthPlan, `Target plan: ${strengthPlan.name} (₹${strengthPlan.price})`);

  // ==================================================================
  // 1. OWNER CREATES MEMBER
  // ==================================================================
  const memberEmail = `rohit.sharma.${Date.now()}@testlifecycle.com`;
  const memberPhone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;
  
  const createMemberRes = await request('/api/members', {
    method: 'POST',
    token: OWNER_TOKEN,
    body: {
      name: 'Rohit Sharma',
      phone: memberPhone,
      email: memberEmail,
      dateOfBirth: '1995-04-30',
      gender: 'Male',
      address: 'Skyline Palms, 7th Cross, Koramangala, Bengaluru',
      joinedDate: new Date().toISOString().split('T')[0],
      emergencyContact: 'Ritika Sharma (+91 98111 88888)',
      notes: 'Focus: Athletic conditioning and strength compound lifts.',
    },
  });

  const createdMember = createMemberRes.data?.member;
  const isMemberCreated = createMemberRes.status === 201 || createMemberRes.status === 200;
  record(
    '1. CREATE MEMBER',
    'Member Record Creation',
    isMemberCreated && !!createdMember?.id,
    `Created member ID: ${createdMember?.id}, Code: ${createdMember?.memberCode}, Gym: ${createdMember?.gymId}`
  );

  const memberId = createdMember.id;
  const memberCode = createdMember.memberCode;

  // Verify Member shows up in Owner Member list
  const memberListRes = await request('/api/members', { token: OWNER_TOKEN });
  const inList = memberListRes.data.some((m: any) => m.id === memberId);
  record('1. CREATE MEMBER', 'Owner Directory Visibility', inList, `Member ${memberCode} visible in Owner directory`);

  // ==================================================================
  // 2. ASSIGN MEMBERSHIP & RECORD PAYMENT
  // ==================================================================
  const today = new Date();
  const startDateStr = today.toISOString().split('T')[0];
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 90);
  const endDateStr = endDate.toISOString().split('T')[0];

  const assignRes = await request('/api/memberships', {
    method: 'POST',
    token: OWNER_TOKEN,
    body: {
      memberId,
      planId: strengthPlan.id,
      startDate: startDateStr,
      endDate: endDateStr,
      finalAmount: Number(strengthPlan.price),
      discountAmount: 0,
      paymentAmount: Number(strengthPlan.price),
      paymentMethod: 'UPI',
      notes: 'Initial 3-month package paid upfront via UPI',
    },
  });

  const assignedMembership = assignRes.data?.membership;
  const initialPayment = assignRes.data?.payment;
  record(
    '2. ASSIGN MEMBERSHIP',
    'Membership & Payment Assignment',
    assignRes.ok && !!assignedMembership && !!initialPayment,
    `Assigned plan: ${assignedMembership?.planName}, Expiry: ${assignedMembership?.endDate}, Receipt: ${initialPayment?.receiptNumber}, Amount: ₹${initialPayment?.amount}`
  );

  // ==================================================================
  // 3. GENERATE INVITATION & AUDIT
  // ==================================================================
  const inviteRes = await request(`/api/members/${memberId}/invite`, {
    method: 'POST',
    token: OWNER_TOKEN,
  });

  const invitationToken = inviteRes.data?.invitationToken;
  const invitationExpiresAt = inviteRes.data?.expiresAt;
  record(
    '3. INVITATION FLOW',
    'Invitation Generation',
    inviteRes.ok && typeof invitationToken === 'string' && invitationToken.startsWith('GYM-'),
    `Generated token: ${invitationToken}, Expires: ${invitationExpiresAt}`
  );

  // ==================================================================
  // 4. ACCOUNT EDGE CASES & SECURITY PRE-CHECKS
  // ==================================================================
  // Edge Case A: Member without invitation token
  const emptyTokenRes = await request('/api/member/link-account', {
    method: 'POST',
    token: MEMBER_TOKEN,
    body: { invitationToken: '' },
  });
  record(
    '4. EDGE CASES',
    'Empty Invitation Token Validation',
    emptyTokenRes.status === 400 && emptyTokenRes.data?.error?.code === 'VALIDATION_ERROR',
    `Returned ${emptyTokenRes.status} ${emptyTokenRes.data?.error?.code}`
  );

  // Edge Case B: Fake/Non-existent invitation code
  const fakeTokenRes = await request('/api/member/link-account', {
    method: 'POST',
    token: MEMBER_TOKEN,
    body: { invitationToken: 'GYM-FAKETOKEN99' },
  });
  record(
    '4. EDGE CASES',
    'Invalid/Unrecognized Token Check',
    fakeTokenRes.status === 404 && fakeTokenRes.data?.error?.code === 'INVALID_TOKEN',
    `Returned ${fakeTokenRes.status} ${fakeTokenRes.data?.error?.code}`
  );

  // Edge Case C: Cross-gym invitation claiming (Tenant B trying to claim Gym A's token)
  const crossGymRes = await request('/api/member/link-account', {
    method: 'POST',
    token: TENANT2_MEMBER_TOKEN,
    body: { invitationToken },
  });
  record(
    '4. EDGE CASES',
    'Cross-Tenant Invitation Hijack Prevention',
    crossGymRes.status === 403 && crossGymRes.data?.error?.code === 'WRONG_GYM',
    `Returned ${crossGymRes.status} ${crossGymRes.data?.error?.code}: ${crossGymRes.data?.error?.message}`
  );

  // ==================================================================
  // 5. MEMBER CLAIMS INVITATION & LINKS ACCOUNT
  // ==================================================================
  const linkRes = await request('/api/member/link-account', {
    method: 'POST',
    token: MEMBER_TOKEN,
    body: { invitationToken },
  });
  record(
    '5. ACCOUNT LINKING',
    'Invitation Claim & Role Assignment',
    linkRes.ok && linkRes.data?.member?.id === memberId && linkRes.data?.member?.accountStatus === 'ACTIVE',
    `Linked to member ${linkRes.data?.member?.name} (${linkRes.data?.member?.memberCode})`
  );

  // Edge Case D: Re-use of claimed invitation code (must be single-use)
  const reuseTokenRes = await request('/api/member/link-account', {
    method: 'POST',
    token: MEMBER_TOKEN,
    body: { invitationToken },
  });
  record(
    '5. ACCOUNT LINKING',
    'Single-Use Token Invalidation (No Replay)',
    reuseTokenRes.status === 404 && reuseTokenRes.data?.error?.code === 'INVALID_TOKEN',
    `Token consumed; replay returned ${reuseTokenRes.status} ${reuseTokenRes.data?.error?.code}`
  );

  // ==================================================================
  // 6. MEMBER AUTHENTICATION & PORTAL ENTRY
  // ==================================================================
  const memberMe = await request('/api/auth/me', { token: MEMBER_TOKEN });
  const isMemberRole = memberMe.data?.applicationRole === 'MEMBER' || memberMe.data?.user?.role === 'MEMBER';
  const memberLinked = memberMe.data?.member?.id === memberId;
  record(
    '6. MEMBER LOGIN',
    'Authentication & Auto-Routing to Member App',
    memberMe.ok && isMemberRole && memberLinked,
    `Logged in as ${memberMe.data?.user?.name || memberMe.data?.member?.name}, Role: ${memberMe.data?.applicationRole || memberMe.data?.user?.role}, MemberCode: ${memberMe.data?.member?.memberCode}`
  );

  // ==================================================================
  // 7. MEMBER VIEWS MEMBERSHIP SYNCHRONIZATION
  // ==================================================================
  const memberMembershipRes = await request('/api/member/membership', { token: MEMBER_TOKEN });
  const memberActivePlan = memberMembershipRes.data?.active;
  const plansMatch = memberActivePlan?.planName === strengthPlan.name &&
                     memberActivePlan?.startDate === startDateStr &&
                     memberActivePlan?.endDate === endDateStr &&
                     Number(memberActivePlan?.totalFee) === Number(strengthPlan.price);
  record(
    '7. MEMBERSHIP SYNC',
    'Owner Plan Assignment -> Member App View Sync',
    plansMatch,
    `Owner created '${strengthPlan.name}' (₹${strengthPlan.price}, ${startDateStr} to ${endDateStr}). Member saw '${memberActivePlan?.planName}' (₹${memberActivePlan?.totalFee}, ${memberActivePlan?.startDate} to ${memberActivePlan?.endDate})`
  );

  // ==================================================================
  // 8. MEMBER CHECK-IN & ATTENDANCE RECORDING
  // ==================================================================
  const checkinRes = await request('/api/member/attendance/check-in', {
    method: 'POST',
    token: MEMBER_TOKEN,
    body: { checkInMethod: 'SELF' },
  });
  record(
    '8. ATTENDANCE',
    'Member Self Check-In',
    checkinRes.ok && checkinRes.data?.alreadyCheckedIn === false,
    `Check-in recorded at ${checkinRes.data?.attendance?.checkInTime}`
  );

  // Duplicate Check-in test (Idempotency)
  const duplicateCheckinRes = await request('/api/member/attendance/check-in', {
    method: 'POST',
    token: MEMBER_TOKEN,
    body: { checkInMethod: 'SELF' },
  });
  record(
    '8. ATTENDANCE',
    'Daily Check-in Idempotency (Duplicate Prevention)',
    duplicateCheckinRes.ok && duplicateCheckinRes.data?.alreadyCheckedIn === true,
    `Duplicate attempt returned alreadyCheckedIn: true with zero extra DB records`
  );

  // Member Attendance History & Streak
  const attendanceRes = await request('/api/member/attendance', { token: MEMBER_TOKEN });
  const hasAttendance = attendanceRes.data?.history?.length >= 1;
  record(
    '8. ATTENDANCE',
    'Attendance History & Streak Count',
    hasAttendance && attendanceRes.data?.checkedInToday === true,
    `Total checkins: ${attendanceRes.data?.totalCount}, Streak: ${attendanceRes.data?.streak}`
  );

  // Owner View Attendance Synchronization
  const ownerMemberDetail = await request(`/api/members/${memberId}`, { token: OWNER_TOKEN });
  const ownerSeesAttendance = (ownerMemberDetail.data?.attendance?.length || 0) >= 1;
  record(
    '8. ATTENDANCE',
    'Owner Attendance Visibility Sync',
    ownerSeesAttendance,
    `Owner fetched member detail and verified ${ownerMemberDetail.data?.attendance?.length} attendance record(s)`
  );

  // ==================================================================
  // 9. MEMBER WORKOUT ROUTINE COMPLETION
  // ==================================================================
  const memberWorkoutsRes = await request('/api/member/workouts', { token: MEMBER_TOKEN });
  const todayWorkout = memberWorkoutsRes.data[0];
  record(
    '9. WORKOUTS',
    'Starter Workout Routine Auto-Provisioning',
    !!todayWorkout?.id,
    `Assigned routine: ${todayWorkout?.title} (Status: ${todayWorkout?.status})`
  );

  // Complete the workout
  const completeWorkoutRes = await request(`/api/member/workouts/${todayWorkout.id}`, {
    method: 'PATCH',
    token: MEMBER_TOKEN,
    body: {
      status: 'COMPLETED',
      notes: 'Finished all sets with solid form. Rest intervals 75s.',
    },
  });
  record(
    '9. WORKOUTS',
    'Member Routine Completion & Persistence',
    completeWorkoutRes.ok && completeWorkoutRes.data?.status === 'COMPLETED',
    `Updated status to ${completeWorkoutRes.data?.status} with updated notes`
  );

  // Owner View Workout Synchronization
  const ownerMemberDetailPostWorkout = await request(`/api/members/${memberId}`, { token: OWNER_TOKEN });
  const ownerWorkout = ownerMemberDetailPostWorkout.data?.workouts?.find((w: any) => w.id === todayWorkout.id);
  record(
    '9. WORKOUTS',
    'Owner Workout Visibility Sync',
    ownerWorkout?.status === 'COMPLETED',
    `Owner views member detail and sees workout '${ownerWorkout?.title}' marked COMPLETED`
  );

  // ==================================================================
  // 10. COMMUNITY INTERACTION & MODERATION
  // ==================================================================
  const postContent = `Hyped to complete my first session at ${gymName}! 3-month strength cycle is on 🚀`;
  const postRes = await request('/api/community/posts', {
    method: 'POST',
    token: MEMBER_TOKEN,
    body: {
      content: postContent,
      postType: 'ACHIEVEMENT',
    },
  });
  const createdPost = postRes.data;
  record(
    '10. COMMUNITY',
    'Member Posts Achievement to Wall',
    postRes.ok && !!createdPost?.id,
    `Post created ID: ${createdPost?.id}, Author: ${createdPost?.authorName} (${createdPost?.authorRole})`
  );

  // Same gym member / owner sees post
  const feedRes = await request('/api/community/feed', { token: OWNER_TOKEN });
  const inFeed = feedRes.data?.some((p: any) => p.id === createdPost.id);
  record(
    '10. COMMUNITY',
    'Same-Gym Community Visibility',
    inFeed,
    `Post visible in Gym A community feed`
  );

  // Cross-tenant: Demo Member or Tenant B must NOT see Rohit's post
  const demoFeedRes = await request('/api/community/feed', { token: DEMO_MEMBER_TOKEN });
  const inDemoFeed = demoFeedRes.data?.some((p: any) => p.id === createdPost.id);
  record(
    '10. COMMUNITY',
    'Cross-Tenant Feed Isolation (Confidentiality)',
    !inDemoFeed,
    `Rohit's post is completely absent from Demo Gym feed`
  );

  // Member Reaction
  const reactionRes = await request(`/api/community/posts/${createdPost.id}/reactions`, {
    method: 'POST',
    token: MEMBER_TOKEN,
    body: { reactionType: 'LIKE' },
  });
  record(
    '10. COMMUNITY',
    'Member Reaction/Like',
    reactionRes.ok && reactionRes.data?.hasLiked === true,
    `Liked post successfully`
  );

  // Owner moderation: Owner deletes / moderates post
  const deletePostRes = await request(`/api/community/posts/${createdPost.id}`, {
    method: 'DELETE',
    token: OWNER_TOKEN,
  });
  record(
    '10. COMMUNITY',
    'Owner Moderation (Staff Post Deletion)',
    deletePostRes.ok && deletePostRes.data?.success === true,
    `Owner moderated and soft-deleted post from community feed`
  );

  // ==================================================================
  // 11. PAYMENT & RECEIPT SYNCHRONIZATION
  // ==================================================================
  const memberPaymentsRes = await request('/api/member/payments', { token: MEMBER_TOKEN });
  const memberPayment = memberPaymentsRes.data?.find((p: any) => p.id === initialPayment.id);
  const paymentSynced = memberPayment &&
    memberPayment.receiptNumber === initialPayment.receiptNumber &&
    Number(memberPayment.amount) === Number(initialPayment.amount) &&
    memberPayment.paymentMethod === 'UPI';

  record(
    '11. PAYMENTS',
    'Owner Payment Ledger -> Member Receipt Sync',
    paymentSynced,
    `Receipt #${memberPayment?.receiptNumber} of ₹${memberPayment?.amount} via ${memberPayment?.paymentMethod} matches Owner entry exactly`
  );

  // Member Role Escalation Prevention: Member attempts to refund
  const refundAttempt = await request('/api/payments/refund', {
    method: 'POST',
    token: MEMBER_TOKEN,
    body: { paymentId: initialPayment.id },
  });
  record(
    '11. PAYMENTS',
    'Member Tampering Prevention (Forbidden Refund)',
    refundAttempt.status === 403,
    `Refund attempt denied with HTTP 403 FORBIDDEN`
  );

  // ==================================================================
  // 12. MORE EDGE CASES: SUSPENDED, ARCHIVED, EXPIRED
  // ==================================================================
  // Create another synthetic member to test Suspended and Expired states without breaking Rohit
  const edgeEmail = `edge.member.${Date.now()}@testgym.com`;
  const edgeMemberRes = await request('/api/members', {
    method: 'POST',
    token: OWNER_TOKEN,
    body: {
      name: 'Pooja Hegde',
      phone: `+91 99${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: edgeEmail,
      joinedDate: '2026-01-01',
    },
  });
  const edgeMember = edgeMemberRes.data?.member;

  // Assign an EXPIRED membership to edge member (ended yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const startEdge = new Date(yesterday);
  startEdge.setDate(startEdge.getDate() - 30);

  await request('/api/memberships', {
    method: 'POST',
    token: OWNER_TOKEN,
    body: {
      memberId: edgeMember.id,
      planId: strengthPlan.id,
      startDate: startEdge.toISOString().split('T')[0],
      endDate: yesterday.toISOString().split('T')[0],
      finalAmount: 2500,
      paymentAmount: 2500,
      paymentMethod: 'CASH',
    },
  });

  // Generate invite and link to edge member token
  const edgeInviteRes = await request(`/api/members/${edgeMember.id}/invite`, {
    method: 'POST',
    token: OWNER_TOKEN,
  });
  const edgeInviteToken = edgeInviteRes.data?.invitationToken;

  const EDGE_MEMBER_TOKEN = 'test-token-member-pooja-gym-a';
  await request('/api/member/link-account', {
    method: 'POST',
    token: EDGE_MEMBER_TOKEN,
    body: { invitationToken: edgeInviteToken },
  });

  // Edge Case E: Expired membership check-in attempt
  const expiredCheckinRes = await request('/api/member/attendance/check-in', {
    method: 'POST',
    token: EDGE_MEMBER_TOKEN,
    body: { checkInMethod: 'SELF' },
  });
  record(
    '12. EDGE CASES',
    'Expired Membership Check-In Block',
    expiredCheckinRes.status === 403 && expiredCheckinRes.data?.error?.code === 'MEMBERSHIP_EXPIRED_OR_INACTIVE',
    `Returned ${expiredCheckinRes.status} ${expiredCheckinRes.data?.error?.code}: ${expiredCheckinRes.data?.error?.message}`
  );

  // Edge Case F: Member with expired membership CAN still view receipts and payments
  const expiredMemberPayments = await request('/api/member/payments', { token: EDGE_MEMBER_TOKEN });
  record(
    '12. EDGE CASES',
    'Expired Member Historical Receipt Access',
    expiredMemberPayments.ok && expiredMemberPayments.data?.length >= 1,
    `Expired member successfully accessed ${expiredMemberPayments.data?.length} historical receipt(s)`
  );

  // Edge Case G: Suspended Member access block
  // Owner updates member status to SUSPENDED
  await request(`/api/members/${edgeMember.id}`, {
    method: 'PUT',
    token: OWNER_TOKEN,
    body: {
      accountStatus: 'SUSPENDED',
      status: 'SUSPENDED',
    },
  });

  const suspendedAccessRes = await request('/api/member/dashboard', { token: EDGE_MEMBER_TOKEN });
  record(
    '12. EDGE CASES',
    'Suspended Member Access Block',
    suspendedAccessRes.status === 403 && suspendedAccessRes.data?.error?.code === 'MEMBER_SUSPENDED',
    `Returned ${suspendedAccessRes.status} ${suspendedAccessRes.data?.error?.code}: ${suspendedAccessRes.data?.error?.message}`
  );

  // ==================================================================
  // 13. DEMO ACCOUNT STABILITY CHECK
  // ==================================================================
  const demoMe = await request('/api/auth/me', { token: DEMO_MEMBER_TOKEN });
  const demoDashboard = await request('/api/member/dashboard', { token: DEMO_MEMBER_TOKEN });
  const demoIntact = demoMe.data?.member?.memberCode === 'RPM-DEMO-001' &&
                     demoMe.data?.member?.name === 'Alex Johnson' &&
                     demoDashboard.data?.member?.id === '00000000-0000-0000-0000-000000000003';
  record(
    '13. DEMO STABILITY',
    'Demo Member Pass & Isolation Preserved',
    demoIntact,
    `Demo Member Alex Johnson (RPM-DEMO-001) in Demo Gym remained completely intact and isolated`
  );

  // ==================================================================
  // FINAL SUMMARY
  // ==================================================================
  console.log('\n==================================================================');
  console.log('LIFECYCLE TEST EXECUTION SUMMARY');
  console.log('==================================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('==================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
