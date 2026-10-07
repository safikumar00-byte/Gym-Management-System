import { db } from '../db/index.ts';
import { 
  gyms, 
  userProfiles, 
  gymCounters, 
  membershipPlans, 
  members, 
  memberships, 
  payments, 
  memberAttendance, 
  memberWorkouts, 
  communityPosts, 
  communityComments, 
  communityReactions, 
  notifications 
} from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { logAuditEvent } from './audit.ts';

export const DEMO_GYM_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000002';
export const DEMO_MEMBER_ID = '00000000-0000-0000-0000-000000000003';
export const DEMO_PLAN_ID = '00000000-0000-0000-0000-000000000004';
export const DEMO_MEMBERSHIP_ID = '00000000-0000-0000-0000-000000000005';
export const DEMO_PAYMENT_ID = '00000000-0000-0000-0000-000000000006';
export const DEMO_STAFF_USER_ID = '00000000-0000-0000-0000-000000000007';
export const DEMO_MEMBER_2_USER_ID = '00000000-0000-0000-0000-000000000008';

export async function seedOrResetDemoMember() {
  console.log('[Demo] Seeding or resetting isolated Demo Member tenant data...');

  return await db.transaction(async (tx) => {
    // 1. Clean existing records for DEMO_GYM_ID only (zero impact on real gyms)
    await tx.delete(memberAttendance).where(eq(memberAttendance.gymId, DEMO_GYM_ID));
    await tx.delete(memberWorkouts).where(eq(memberWorkouts.gymId, DEMO_GYM_ID));
    await tx.delete(communityReactions).where(eq(communityReactions.gymId, DEMO_GYM_ID));
    await tx.delete(communityComments).where(eq(communityComments.gymId, DEMO_GYM_ID));
    await tx.delete(communityPosts).where(eq(communityPosts.gymId, DEMO_GYM_ID));
    await tx.delete(payments).where(eq(payments.gymId, DEMO_GYM_ID));
    await tx.delete(memberships).where(eq(memberships.gymId, DEMO_GYM_ID));
    await tx.delete(notifications).where(eq(notifications.gymId, DEMO_GYM_ID));
    await tx.delete(members).where(eq(members.gymId, DEMO_GYM_ID));
    await tx.delete(userProfiles).where(eq(userProfiles.gymId, DEMO_GYM_ID));
    await tx.delete(membershipPlans).where(eq(membershipPlans.gymId, DEMO_GYM_ID));
    await tx.delete(gymCounters).where(eq(gymCounters.gymId, DEMO_GYM_ID));
    await tx.delete(gyms).where(eq(gyms.id, DEMO_GYM_ID));

    // 2. Insert Demo Gym
    const [demoGym] = await tx.insert(gyms).values({
      id: DEMO_GYM_ID,
      name: 'Raw Power Gym — Demo',
      phone: '+91 98111 00000',
      email: 'demo@rawpowergym.app',
      address: '4th Floor, Platinum Towers, MG Road, Bengaluru',
      upiId: 'rawpowerdemo@upi',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      receiptPrefix: 'RPM-',
      receiptFooter: 'Thank you for training with us at Raw Power Gym — Demo! Keep pushing limits.',
      status: 'ACTIVE',
    }).returning();

    // 3. Insert Counter for Demo Gym
    await tx.insert(gymCounters).values({
      gymId: DEMO_GYM_ID,
      memberSequence: 20,
      receiptSequence: 9020,
    });

    // 4. Insert Demo Membership Plan
    const [demoPlan] = await tx.insert(membershipPlans).values({
      id: DEMO_PLAN_ID,
      gymId: DEMO_GYM_ID,
      name: 'Premium Annual Pass',
      durationMonths: 12,
      durationDays: 365,
      price: '18000.00',
      description: 'All-inclusive annual membership: 24/7 gym access, recovery zone, cardio theater & mobility workshops.',
      active: true,
    }).returning();

    // 5. Insert Staff User Profile (Coach Vikram)
    const [staffUser] = await tx.insert(userProfiles).values({
      id: DEMO_STAFF_USER_ID,
      firebaseUid: 'uid-demo-trainer-vikram',
      gymId: DEMO_GYM_ID,
      name: 'Coach Vikram (Head Trainer)',
      email: 'vikram.coach@rawpowergym.app',
      role: 'TRAINER',
    }).returning();

    // 6. Insert Peer Member Profile (Priya Sharma)
    const [peerUser] = await tx.insert(userProfiles).values({
      id: DEMO_MEMBER_2_USER_ID,
      firebaseUid: 'uid-demo-member-priya',
      gymId: DEMO_GYM_ID,
      name: 'Priya Sharma',
      email: 'priya.s@demo.rawpowergym.app',
      role: 'MEMBER',
    }).returning();

    // 7. Insert Demo Member User Profile (Alex Johnson)
    const [demoUser] = await tx.insert(userProfiles).values({
      id: DEMO_USER_ID,
      firebaseUid: 'uid-demo-member-alex',
      gymId: DEMO_GYM_ID,
      name: 'Alex Johnson',
      email: 'demo-member@demo.rawpowergym.app',
      role: 'MEMBER',
    }).returning();

    // 8. Insert Demo Member Record (Alex Johnson)
    const [demoMember] = await tx.insert(members).values({
      id: DEMO_MEMBER_ID,
      gymId: DEMO_GYM_ID,
      userId: DEMO_USER_ID,
      memberCode: 'RPM-DEMO-001',
      name: 'Alex Johnson',
      phone: '+91 98111 22334',
      email: 'demo-member@demo.rawpowergym.app',
      dateOfBirth: '1996-05-14',
      gender: 'Male',
      address: 'Flat 402, Highrise Heights, Sector 18, Bengaluru',
      emergencyContactName: 'Sarah Johnson',
      emergencyContactPhone: '+91 98111 55667',
      joinDate: '2025-06-15',
      status: 'Active',
      accountStatus: 'ACTIVE',
      notes: 'Fitness Focus: Hypertrophy & Deadlift Strength (Current PR: 180kg)',
    }).returning();

    // 9. Insert Active Membership (~75 days remaining into the future)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 290);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 75);

    const [demoMembership] = await tx.insert(memberships).values({
      id: DEMO_MEMBERSHIP_ID,
      gymId: DEMO_GYM_ID,
      memberId: DEMO_MEMBER_ID,
      planId: DEMO_PLAN_ID,
      planName: 'Premium Annual Pass',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalFee: '18000.00',
      discount: '0.00',
      price: '18000.00',
      status: 'Active',
    }).returning();

    // 9b. Insert Previous Membership History (Completed 3 Months Starter Pass)
    const prevStart = new Date();
    prevStart.setDate(prevStart.getDate() - 380);
    const prevEnd = new Date();
    prevEnd.setDate(prevEnd.getDate() - 290);
    const DEMO_PREV_MS_ID = '00000000-0000-0000-0000-000000000009';
    const DEMO_PREV_PAY_ID = '00000000-0000-0000-0000-000000000010';

    await tx.insert(memberships).values({
      id: DEMO_PREV_MS_ID,
      gymId: DEMO_GYM_ID,
      memberId: DEMO_MEMBER_ID,
      planId: DEMO_PLAN_ID,
      planName: '3 Months Starter Pass',
      startDate: prevStart.toISOString().split('T')[0],
      endDate: prevEnd.toISOString().split('T')[0],
      totalFee: '5500.00',
      discount: '0.00',
      price: '5500.00',
      status: 'Expired',
    });

    // 10. Insert Verified Payment Receipts
    const recentPayDate = new Date();
    recentPayDate.setDate(recentPayDate.getDate() - 15);

    await tx.insert(payments).values([
      {
        id: DEMO_PAYMENT_ID,
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        memberName: 'Alex Johnson',
        membershipId: DEMO_MEMBERSHIP_ID,
        receiptNumber: 'RPM-REC-9012',
        amount: '18000.00',
        paymentMethod: 'UPI',
        status: 'Paid',
        paymentDate: recentPayDate,
        notes: 'Annual membership renewal paid via Google Pay UPI. Transaction verified.',
      },
      {
        id: DEMO_PREV_PAY_ID,
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        memberName: 'Alex Johnson',
        membershipId: DEMO_PREV_MS_ID,
        receiptNumber: 'RPM-REC-8901',
        amount: '5500.00',
        paymentMethod: 'UPI',
        status: 'Paid',
        paymentDate: prevStart,
        notes: 'Introductory 3-month gym membership fee paid via UPI.',
      },
    ]);

    // 11. Insert Realistic Attendance History (Rich calendar coverage + 5-day active streak + >100 scalable records)
    // Days 1, 2, 3, 4, 5 days ago: checked in (5-day active streak)
    // Day 0 (today): NOT checked in yet, ready for user test!
    const attendanceTimes: Array<{ daysAgo: number; hour: number; min: number; method?: string; notes?: string | null }> = [
      { daysAgo: 1, hour: 7, min: 45, method: 'SELF', notes: 'Morning session' },
      { daysAgo: 2, hour: 8, min: 10, method: 'QR' },
      { daysAgo: 3, hour: 7, min: 30, method: 'QR' },
      { daysAgo: 4, hour: 18, min: 15, method: 'QR' },
      { daysAgo: 5, hour: 8, min: 0, method: 'QR' },
      { daysAgo: 7, hour: 7, min: 50, method: 'QR' },
      { daysAgo: 8, hour: 8, min: 20, method: 'QR' },
      { daysAgo: 10, hour: 7, min: 40, method: 'QR' },
      { daysAgo: 12, hour: 8, min: 15, method: 'QR' },
      { daysAgo: 14, hour: 7, min: 30, method: 'QR' },
      { daysAgo: 16, hour: 8, min: 5, method: 'QR' },
      { daysAgo: 17, hour: 7, min: 55, method: 'QR' },
      { daysAgo: 19, hour: 18, min: 30, method: 'QR' },
      { daysAgo: 21, hour: 8, min: 0, method: 'QR' },
      { daysAgo: 23, hour: 7, min: 40, method: 'QR' },
      { daysAgo: 25, hour: 8, min: 10, method: 'QR' },
    ];

    // Generate historical consistent attendance across the 290 days of Alex's Annual Membership (3 sessions/week)
    for (let d = 27; d <= 285; d += 2) {
      // Skip every 7th day to simulate rest days
      if (d % 7 === 0) continue;
      attendanceTimes.push({
        daysAgo: d,
        hour: d % 2 === 0 ? 7 : 18,
        min: (d * 7) % 50,
        method: d % 3 === 0 ? 'SELF' : 'QR',
        notes: null,
      });
    }

    const attendanceInserts = attendanceTimes.map((item) => {
      const dt = new Date();
      dt.setDate(dt.getDate() - item.daysAgo);
      dt.setHours(item.hour, item.min, 0, 0);
      return {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        checkInTime: dt,
        checkInMethod: item.method || 'QR',
        notes: item.notes || null,
      };
    });

    await tx.insert(memberAttendance).values(attendanceInserts);

    // 12. Insert Workouts (Historical Completed, Today's Assigned, and Upcoming Tomorrow)
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0];

    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

    await tx.insert(memberWorkouts).values([
      // Today's workout (Assigned)
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        title: 'Chest & Hypertrophy Conditioning',
        description: 'Focus on high-tension hypertrophy, controlled eccentrics, and strict core bracing.',
        scheduledDate: todayStr,
        status: 'ASSIGNED',
        exercises: JSON.stringify([
          { name: 'Warm-up: Dynamic Stretch & Jump Rope', sets: '3', reps: '2 min', completed: true },
          { name: 'Barbell Flat Bench Press', sets: '4', reps: '8-10', weight: '75 kg', completed: false },
          { name: 'Incline Dumbbell Press', sets: '3', reps: '12', weight: '24 kg', completed: false },
          { name: 'Cable Chest Flyes (Low-to-High)', sets: '3', reps: '15', weight: '14 kg', completed: false },
          { name: 'Dips (Weighted)', sets: '3', reps: '10', weight: '+10 kg', completed: false },
          { name: 'Hanging Knee Tucks', sets: '3', reps: '15', completed: false },
        ]),
        notes: 'Coach Vikram: Rest 90 seconds between heavy bench sets. Maintain retract-and-depress scapula position.',
      },
      // Yesterday's completed workout
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        title: 'Full Body Conditioning & Core',
        description: 'High-density strength workout focusing on compound lifts and core endurance.',
        scheduledDate: yesterdayStr,
        status: 'COMPLETED',
        exercises: JSON.stringify([
          { name: 'Warm-up: Dynamic Mobility & Band Pull-Aparts', sets: '3', reps: '10', completed: true },
          { name: 'Barbell Flat Bench Press', sets: '4', reps: '8', weight: '95 kg', completed: true },
          { name: 'Incline Dumbbell Press', sets: '3', reps: '10', weight: '26 kg', completed: true },
          { name: 'Standing Overhead Barbell Press', sets: '3', reps: '8', weight: '55 kg', completed: true },
          { name: 'Plank Hold (Weighted)', sets: '3', reps: '60 sec', weight: '+15 kg', completed: true },
        ]),
        notes: 'Felt great! Bench press 95kg PR hit smoothly with solid leg drive.',
      },
      // 3 days ago: Back & Biceps PR Day (Completed)
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        title: 'Back, Biceps & Pull Strength',
        description: 'Heavy posterior chain pull routine with high-volume lat hypertrophy.',
        scheduledDate: threeDaysAgoStr,
        status: 'COMPLETED',
        exercises: JSON.stringify([
          { name: 'Deadlift (Conventional)', sets: '5', reps: '5', weight: '180 kg', completed: true },
          { name: 'Barbell Bent-Over Row', sets: '4', reps: '8', weight: '75 kg', completed: true },
          { name: 'Wide Grip Lat Pulldown', sets: '4', reps: '12', weight: '65 kg', completed: true },
          { name: 'Incline Dumbbell Bicep Curls', sets: '3', reps: '12', weight: '16 kg', completed: true },
        ]),
        notes: 'Deadlift locked out solid at 180kg without belt slip. Excellent speed off the floor.',
      },
      // 5 days ago: Leg Day (Completed)
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        title: 'Leg Day & Explosive Power',
        description: 'Quad and hamstring hypertrophy with eccentric deceleration control.',
        scheduledDate: fiveDaysAgoStr,
        status: 'COMPLETED',
        exercises: JSON.stringify([
          { name: 'Barbell Back Squat', sets: '4', reps: '8', weight: '120 kg', completed: true },
          { name: 'Romanian Deadlift', sets: '4', reps: '10', weight: '90 kg', completed: true },
          { name: 'Leg Press (Plate Loaded)', sets: '3', reps: '15', weight: '220 kg', completed: true },
          { name: 'Seated Calf Raises', sets: '4', reps: '20', weight: '50 kg', completed: true },
        ]),
        notes: 'Deep squat depth achieved on all sets. Hydrated well.',
      },
      // Upcoming tomorrow (Assigned)
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        title: 'Mobility & Active Recovery Flow',
        description: 'Hip openers, thoracic spine rotations, and light treadmill flush.',
        scheduledDate: tomorrowStr,
        status: 'ASSIGNED',
        exercises: JSON.stringify([
          { name: 'Foam Rolling (Quads, Lats, Calves)', sets: '1', reps: '10 min', completed: false },
          { name: 'World Greatest Stretch', sets: '3', reps: '8 / side', completed: false },
          { name: 'Light Incline Treadmill Walk', sets: '1', reps: '20 min', completed: false },
        ]),
        notes: 'Focus on full lung capacity breathing and tissue relaxation.',
      },
    ]);

    // 13. Insert Community Posts, Comments, and Reactions
    // Post 1: Pinned Gym Announcement from Coach Vikram
    const [post1] = await tx.insert(communityPosts).values({
      gymId: DEMO_GYM_ID,
      authorUserId: DEMO_STAFF_USER_ID,
      authorName: 'Coach Vikram (Head Trainer)',
      authorRole: 'TRAINER',
      content: '🔥 30-Day Consistency Challenge kicks off Monday! Check in daily on the Member App to climb the gym leaderboard and earn exclusive Raw Power athletic gear. Let’s make every workout count!',
      postType: 'GYM_ANNOUNCEMENT',
      isPinned: true,
      likesCount: 6,
      commentsCount: 2,
    }).returning();

    await tx.insert(communityComments).values([
      {
        gymId: DEMO_GYM_ID,
        postId: post1.id,
        authorUserId: DEMO_MEMBER_2_USER_ID,
        authorName: 'Priya Sharma',
        content: 'Ready for this challenge! Count me in 💥',
      },
      {
        gymId: DEMO_GYM_ID,
        postId: post1.id,
        authorUserId: DEMO_USER_ID,
        authorName: 'Alex Johnson',
        content: 'Streak is already at 5 days. Bringing my A-game!',
      },
    ]);

    // Post 2: Member Achievement by Alex Johnson (current user)
    const [post2] = await tx.insert(communityPosts).values({
      gymId: DEMO_GYM_ID,
      authorUserId: DEMO_USER_ID,
      authorMemberId: DEMO_MEMBER_ID,
      authorName: 'Alex Johnson',
      authorRole: 'MEMBER',
      content: 'Hit a new personal record on Bench Press today: 95kg for 3 clean reps! Big shoutout to Coach Vikram for the bar-path cue. Consistency and nutrition are finally compounding 💪🏋️‍♂️',
      postType: 'ACHIEVEMENT',
      isPinned: false,
      likesCount: 8,
      commentsCount: 2,
    }).returning();

    // Reaction on Post 2 by Alex himself
    await tx.insert(communityReactions).values({
      gymId: DEMO_GYM_ID,
      postId: post2.id,
      userId: DEMO_USER_ID,
      reactionType: 'LIKE',
    });

    await tx.insert(communityComments).values([
      {
        gymId: DEMO_GYM_ID,
        postId: post2.id,
        authorUserId: DEMO_STAFF_USER_ID,
        authorName: 'Coach Vikram (Head Trainer)',
        content: 'Phenomenal bar path Alex! 100kg is right around the corner next month.',
      },
      {
        gymId: DEMO_GYM_ID,
        postId: post2.id,
        authorUserId: DEMO_MEMBER_2_USER_ID,
        authorName: 'Priya Sharma',
        content: 'Insane progress! Super inspiring 🔥',
      },
    ]);

    // Post 3: General post by Priya Sharma
    const [post3] = await tx.insert(communityPosts).values({
      gymId: DEMO_GYM_ID,
      authorUserId: DEMO_MEMBER_2_USER_ID,
      authorName: 'Priya Sharma',
      authorRole: 'MEMBER',
      content: 'Early morning spin and core circuit done! 500 kcal burned before 7:30 AM 🚴‍♀️ Who else trained today?',
      postType: 'MEMBER_POST',
      isPinned: false,
      likesCount: 4,
      commentsCount: 1,
    }).returning();

    await tx.insert(communityComments).values({
      gymId: DEMO_GYM_ID,
      postId: post3.id,
      authorUserId: DEMO_USER_ID,
      authorName: 'Alex Johnson',
      content: 'Crushing it Priya! Hitting the weights this afternoon.',
    });

    // 14. Notifications for Alex
    await tx.insert(notifications).values([
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        memberName: 'Alex Johnson',
        type: 'MEMBERSHIP_ACTIVE',
        title: 'Membership Active',
        message: 'Your Premium Annual Pass is active with 75 days remaining. Enjoy full facility access.',
        read: false,
      },
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        memberName: 'Alex Johnson',
        type: 'WORKOUT_ASSIGNED',
        title: 'New Workout Assigned',
        message: 'Coach Vikram assigned today’s routine: Chest & Hypertrophy Conditioning.',
        read: true,
      },
      {
        gymId: DEMO_GYM_ID,
        memberId: DEMO_MEMBER_ID,
        memberName: 'Alex Johnson',
        type: 'COMMUNITY_INTERACTION',
        title: 'Community Interaction',
        message: 'Coach Vikram commented on your PR post: "Phenomenal bar path Alex!"',
        read: true,
      },
    ]);

    await logAuditEvent({
      gymId: DEMO_GYM_ID,
      userId: DEMO_USER_ID,
      action: 'DEMO_MEMBER_SEEDED',
      entityType: 'MEMBER',
      entityId: DEMO_MEMBER_ID,
      details: 'Demo member Alex Johnson (RPM-DEMO-001) seeded with rich isolated state.',
      tx,
    });

    console.log('[Demo] Seeding complete successfully.');

    return {
      gym: demoGym,
      user: demoUser,
      member: demoMember,
      membership: demoMembership,
    };
  });
}
