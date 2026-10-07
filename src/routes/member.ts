import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { 
  members, 
  memberships, 
  payments, 
  gyms, 
  memberAttendance, 
  memberWorkouts, 
  communityPosts, 
  userProfiles 
} from '../db/schema.ts';
import { eq, and, desc, sql, gte, lte, ne, or } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit.ts';

const router = Router();

/**
 * Middleware to ensure the authenticated user has a linked Member record
 */
const requireLinkedMember = async (req: AuthRequest, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  const gymId = req.user.gymId;
  const userId = req.user.userId;

  let member = await db.query.members.findFirst({
    where: and(eq(members.userId, userId), eq(members.gymId, gymId)),
    orderBy: (m, { desc }) => [desc(m.updatedAt)],
  });

  // If user has role MEMBER or is testing with demo account, fall back to memberId
  if (!member && req.user.memberId) {
    member = await db.query.members.findFirst({
      where: and(eq(members.id, req.user.memberId), eq(members.gymId, gymId)),
    });
  }

  // If still not linked, check if user's email matches an unlinked member in the gym
  if (!member && req.user.email) {
    const matched = await db.query.members.findFirst({
      where: and(eq(members.gymId, gymId), eq(members.email, req.user.email)),
    });
    if (matched) {
      const [updated] = await db.update(members)
        .set({ userId, accountStatus: 'ACTIVE', updatedAt: new Date() })
        .where(eq(members.id, matched.id))
        .returning();
      member = updated;
    }
  }

  if (!member) {
    return res.status(403).json({
      error: {
        code: 'NO_LINKED_MEMBER',
        message: 'No gym member profile is linked to this authenticated account. Please contact gym staff for an invitation.',
      },
    });
  }

  if (member.accountStatus === 'SUSPENDED') {
    return res.status(403).json({
      error: {
        code: 'MEMBER_SUSPENDED',
        message: 'Your gym membership account has been suspended. Please contact gym administration for assistance.',
      },
    });
  }

  if (member.status === 'ARCHIVED' || member.status === 'DEACTIVATED') {
    return res.status(403).json({
      error: {
        code: 'MEMBER_ARCHIVED',
        message: 'This member account has been archived. Please contact gym administration to reactivate your pass.',
      },
    });
  }

  (req as any).member = member;
  next();
};

// GET /api/member/dashboard - High-level personalized member home dashboard
router.get('/dashboard', requireAuth, requireLinkedMember, async (req: AuthRequest, res: Response) => {
  try {
    const member = (req as any).member;
    const gymId = req.user!.gymId;

    // Fetch gym details
    const gym = await db.query.gyms.findFirst({
      where: eq(gyms.id, gymId),
    });

    // Fetch latest active membership
    const latestMembership = await db.query.memberships.findFirst({
      where: and(eq(memberships.memberId, member.id), eq(memberships.gymId, gymId)),
      orderBy: (ms, { desc }) => [desc(ms.endDate)],
    });

    // Calculate days remaining
    let daysRemaining = 0;
    let isExpired = false;
    if (latestMembership) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(latestMembership.endDate);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = endDate.getTime() - today.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) {
        daysRemaining = 0;
        isExpired = true;
      }
    }

    // Fetch member payments to calculate balance
    const memberPayments = await db.query.payments.findMany({
      where: and(eq(payments.memberId, member.id), eq(payments.gymId, gymId)),
    });
    const totalPaid = memberPayments.reduce((acc, p) => acc + parseFloat(p.amount || '0'), 0);
    const totalFee = latestMembership ? parseFloat(latestMembership.price || '0') : 0;
    const pendingDues = Math.max(0, totalFee - totalPaid);

    // Fetch attendance metrics (this month + streak)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const attendances = await db.query.memberAttendance.findMany({
      where: and(eq(memberAttendance.memberId, member.id), eq(memberAttendance.gymId, gymId)),
      orderBy: (a, { desc }) => [desc(a.checkInTime)],
    });

    const thisMonthCheckins = attendances.filter(a => new Date(a.checkInTime) >= startOfMonth).length;
    const lastCheckin = attendances[0] || null;

    // Check if checked in today
    const todayStr = new Date().toISOString().split('T')[0];
    const checkedInToday = attendances.some(a => {
      const dStr = new Date(a.checkInTime).toISOString().split('T')[0];
      return dStr === todayStr;
    });

    // Calculate streak (consecutive days checked in)
    let streak = 0;
    const uniqueDays = new Set(attendances.map(a => new Date(a.checkInTime).toISOString().split('T')[0]));
    const checkDate = new Date();
    // if not checked in today yet, check from yesterday
    if (!checkedInToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const d = checkDate.toISOString().split('T')[0];
      if (uniqueDays.has(d)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Fetch today's workout
    const todayWorkout = await db.query.memberWorkouts.findFirst({
      where: and(
        eq(memberWorkouts.memberId, member.id),
        eq(memberWorkouts.gymId, gymId),
        eq(memberWorkouts.scheduledDate, todayStr)
      ),
    });

    // Fetch pinned announcements from community
    const announcements = await db.query.communityPosts.findMany({
      where: and(
        eq(communityPosts.gymId, gymId),
        sql`${communityPosts.deletedAt} IS NULL`,
        sql`(${communityPosts.isPinned} = true OR ${communityPosts.postType} = 'GYM_ANNOUNCEMENT')`
      ),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
      limit: 3,
    });

    res.json({
      member: {
        id: member.id,
        memberCode: member.memberCode,
        name: member.name,
        email: member.email,
        phone: member.phone,
        joinDate: member.joinDate,
        status: member.status,
        accountStatus: member.accountStatus,
        photoUrl: member.photoUrl,
        emergencyContactName: member.emergencyContactName,
        emergencyContactPhone: member.emergencyContactPhone,
      },
      gym: {
        id: gym?.id,
        name: gym?.name,
        phone: gym?.phone,
        email: gym?.email,
        address: gym?.address,
        currency: gym?.currency || 'INR',
      },
      membership: latestMembership ? {
        id: latestMembership.id,
        planName: latestMembership.planName,
        startDate: latestMembership.startDate,
        endDate: latestMembership.endDate,
        daysRemaining,
        isExpired,
        totalFee,
        totalPaid,
        pendingDues,
        status: latestMembership.status,
      } : null,
      attendance: {
        thisMonthCheckins,
        totalCheckins: attendances.length,
        streak,
        checkedInToday,
        lastCheckinTime: lastCheckin ? lastCheckin.checkInTime : null,
      },
      todayWorkout: todayWorkout || null,
      announcements,
    });
  } catch (error: any) {
    console.error('Error in /api/member/dashboard:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load member dashboard' } });
  }
});

// GET /api/member/profile - Full profile of authenticated member
router.get('/profile', requireAuth, requireLinkedMember, async (req: AuthRequest, res: Response) => {
  try {
    const member = (req as any).member;
    res.json(member);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load profile' } });
  }
});

// PATCH /api/member/profile - Member self-service updates for permitted personal fields
router.patch('/profile', requireAuth, requireLinkedMember, async (req: AuthRequest, res: Response) => {
  try {
    const member = (req as any).member;
    const { 
      phone, 
      emergencyContactName, 
      emergencyContactPhone, 
      address, 
      dateOfBirth, 
      gender, 
      photoUrl,
      notes 
    } = req.body;

    const [updated] = await db.update(members)
      .set({
        ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
        ...(emergencyContactName !== undefined ? { emergencyContactName: String(emergencyContactName).trim() } : {}),
        ...(emergencyContactPhone !== undefined ? { emergencyContactPhone: String(emergencyContactPhone).trim() } : {}),
        ...(address !== undefined ? { address: String(address).trim() } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(photoUrl !== undefined ? { photoUrl: String(photoUrl).trim() } : {}),
        ...(notes !== undefined ? { notes: String(notes).trim() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(members.id, member.id))
      .returning();

    await logAuditEvent({
      gymId: req.user!.gymId,
      userId: req.user!.userId,
      action: 'MEMBER_UPDATED',
      entityType: 'MEMBER',
      entityId: member.id,
      details: `Member ${member.name} updated self-service profile details.`,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating member profile:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update member profile' } });
  }
});

// GET /api/member/membership - Membership details and history
router.get('/membership', requireAuth, requireLinkedMember, async (req: AuthRequest, res: Response) => {
  try {
    const member = (req as any).member;
    const gymId = req.user!.gymId;

    const allMemberships = await db.query.memberships.findMany({
      where: and(eq(memberships.memberId, member.id), eq(memberships.gymId, gymId)),
      orderBy: (ms, { desc }) => [desc(ms.endDate)],
      with: {
        plan: true,
      },
    });

    const active = allMemberships[0] || null;

    res.json({
      active,
      history: allMemberships,
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load membership details' } });
  }
});

// GET /api/member/payments - Payment receipts strictly for authenticated member
router.get('/payments', requireAuth, requireLinkedMember, async (req: AuthRequest, res: Response) => {
  try {
    const member = (req as any).member;
    const gymId = req.user!.gymId;

    const memberPayments = await db.query.payments.findMany({
      where: and(eq(payments.memberId, member.id), eq(payments.gymId, gymId)),
      orderBy: (p, { desc }) => [desc(p.paymentDate)],
      with: {
        membership: true,
      },
    });

    res.json(memberPayments);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load payment history' } });
  }
});

// GET /api/member/attendance - Check-in history, month count, streak
router.get('/attendance', requireAuth, requireLinkedMember, async (req: AuthRequest, res: Response) => {
  try {
    const member = (req as any).member;
    const gymId = req.user!.gymId;

    const queryLimit = req.query.limit ? Math.min(500, parseInt(String(req.query.limit), 10) || 100) : 100;
    const history = await db.query.memberAttendance.findMany({
      where: and(eq(memberAttendance.memberId, member.id), eq(memberAttendance.gymId, gymId)),
      orderBy: (a, { desc }) => [desc(a.checkInTime)],
      limit: queryLimit,
    });

    // Check if checked in today
    const todayStr = new Date().toISOString().split('T')[0];
    const checkedInToday = history.some(a => {
      return new Date(a.checkInTime).toISOString().split('T')[0] === todayStr;
    });

    // Streak calculation
    let streak = 0;
    const uniqueDays = new Set(history.map(a => new Date(a.checkInTime).toISOString().split('T')[0]));
    const checkDate = new Date();
    if (!checkedInToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const d = checkDate.toISOString().split('T')[0];
      if (uniqueDays.has(d)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    res.json({
      history,
      checkedInToday,
      streak,
      totalCount: history.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load attendance records' } });
  }
});

// POST /api/member/attendance/check-in - Self or QR Check-in with daily idempotency
router.post('/attendance/check-in', requireAuth, requireLinkedMember, async (req: AuthRequest, res: Response) => {
  try {
    const member = (req as any).member;
    const gymId = req.user!.gymId;
    const { checkInMethod = 'SELF', notes } = req.body;

    const todayStr = new Date().toISOString().split('T')[0];

    // Verify member has an active membership for check-in privileges
    const activeMembership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.memberId, member.id),
        eq(memberships.gymId, gymId),
        gte(memberships.endDate, todayStr),
        eq(memberships.status, 'Active')
      ),
    });

    if (!activeMembership) {
      return res.status(403).json({
        error: {
          code: 'MEMBERSHIP_EXPIRED_OR_INACTIVE',
          message: 'Check-in requires an active gym membership. Your membership has expired or is inactive. Please renew at the gym desk.',
        },
      });
    }

    // Check if already checked in today
    const existingToday = await db.query.memberAttendance.findFirst({
      where: and(
        eq(memberAttendance.memberId, member.id),
        eq(memberAttendance.gymId, gymId),
        sql`DATE(${memberAttendance.checkInTime}) = DATE(${todayStr})`
      ),
    });

    if (existingToday) {
      return res.json({
        success: true,
        alreadyCheckedIn: true,
        attendance: existingToday,
        message: 'You have already checked in today! Keep up the great work.',
      });
    }

    const [newCheckin] = await db.insert(memberAttendance).values({
      gymId,
      memberId: member.id,
      checkInTime: new Date(),
      checkInMethod,
      notes: notes || null,
    }).returning();

    await logAuditEvent({
      gymId,
      userId: req.user!.userId,
      action: 'ATTENDANCE_CHECKIN',
      entityType: 'ATTENDANCE',
      entityId: newCheckin.id,
      details: `${member.name} (${member.memberCode}) checked in via ${checkInMethod}.`,
    });

    res.status(201).json({
      success: true,
      alreadyCheckedIn: false,
      attendance: newCheckin,
      message: 'Check-in recorded successfully! Have an awesome workout.',
    });
  } catch (error: any) {
    console.error('Error during check-in:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to record check-in' } });
  }
});

// GET /api/member/workouts - Assigned workout routines & history
router.get('/workouts', requireAuth, requireLinkedMember, async (req: AuthRequest, res: Response) => {
  try {
    const member = (req as any).member;
    const gymId = req.user!.gymId;

    const queryLimit = req.query.limit ? Math.min(200, parseInt(String(req.query.limit), 10) || 50) : 50;
    const workouts = await db.query.memberWorkouts.findMany({
      where: and(eq(memberWorkouts.memberId, member.id), eq(memberWorkouts.gymId, gymId)),
      orderBy: (w, { desc }) => [desc(w.scheduledDate)],
      limit: queryLimit,
    });

    // If no workouts assigned yet, provide starter sample routine so the screen is never blank
    if (workouts.length === 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const starterRoutine = {
        title: 'Full Body Conditioning & Core',
        description: 'Starter strength routine: warmup, compound lifts, cardio finisher.',
        scheduledDate: todayStr,
        status: 'ASSIGNED',
        exercises: JSON.stringify([
          { name: 'Warm-up: Dynamic Stretch & Jump Rope', sets: '3', reps: '2 min', completed: true },
          { name: 'Barbell Back Squat', sets: '4', reps: '10', weight: '50 kg', completed: false },
          { name: 'Dumbbell Chest Press', sets: '4', reps: '12', weight: '16 kg', completed: false },
          { name: 'Lat Pulldowns', sets: '3', reps: '12', weight: '45 kg', completed: false },
          { name: 'Plank Hold', sets: '3', reps: '45 sec', completed: false },
        ]),
        notes: 'Stay hydrated and rest 90s between heavy sets.',
      };

      const [createdStarter] = await db.insert(memberWorkouts).values({
        gymId,
        memberId: member.id,
        ...starterRoutine,
      }).returning();

      return res.json([createdStarter]);
    }

    res.json(workouts);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load workouts' } });
  }
});

// PATCH /api/member/workouts/:id - Update workout status or exercise completion
router.patch('/workouts/:id', requireAuth, requireLinkedMember, async (req: AuthRequest, res: Response) => {
  try {
    const member = (req as any).member;
    const workoutId = req.params.id;
    const { status, exercises, notes } = req.body;

    const existing = await db.query.memberWorkouts.findFirst({
      where: and(
        eq(memberWorkouts.id, workoutId),
        eq(memberWorkouts.memberId, member.id),
        eq(memberWorkouts.gymId, req.user!.gymId)
      ),
    });

    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workout routine not found' } });
    }

    const [updated] = await db.update(memberWorkouts)
      .set({
        ...(status !== undefined ? { status: String(status).toUpperCase() } : {}),
        ...(exercises !== undefined ? { exercises: typeof exercises === 'string' ? exercises : JSON.stringify(exercises) } : {}),
        ...(notes !== undefined ? { notes: String(notes) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(memberWorkouts.id, workoutId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update workout status' } });
  }
});

// GET /api/member/activity - Comprehensive Personal Activity, History & Fitness Journey
router.get('/activity', requireAuth, requireLinkedMember, async (req: AuthRequest, res: Response) => {
  try {
    const member = (req as any).member;
    const gymId = req.user!.gymId;
    const userId = req.user!.userId;
    const { type, from, to, date, search, limit = 100, page, offset } = req.query;

    // Load data from existing PostgreSQL source-of-truth tables in parallel
    const [attendances, workouts, memberPayments, memberMemberships, posts] = await Promise.all([
      db.query.memberAttendance.findMany({
        where: and(eq(memberAttendance.memberId, member.id), eq(memberAttendance.gymId, gymId)),
        orderBy: (a, { desc }) => [desc(a.checkInTime)],
      }),
      db.query.memberWorkouts.findMany({
        where: and(eq(memberWorkouts.memberId, member.id), eq(memberWorkouts.gymId, gymId)),
        orderBy: (w, { desc }) => [desc(w.scheduledDate), desc(w.createdAt)],
      }),
      db.query.payments.findMany({
        where: and(eq(payments.memberId, member.id), eq(payments.gymId, gymId)),
        orderBy: (p, { desc }) => [desc(p.paymentDate)],
      }),
      db.query.memberships.findMany({
        where: and(eq(memberships.memberId, member.id), eq(memberships.gymId, gymId)),
        orderBy: (ms, { desc }) => [desc(ms.startDate)],
      }),
      db.query.communityPosts.findMany({
        where: and(
          eq(communityPosts.gymId, gymId),
          or(eq(communityPosts.authorMemberId, member.id), eq(communityPosts.authorUserId, userId)),
          sql`${communityPosts.deletedAt} IS NULL`
        ),
        orderBy: (cp, { desc }) => [desc(cp.createdAt)],
      }),
    ]);

    // Calculate Streak & Longest Streak
    const todayStr = new Date().toISOString().split('T')[0];
    const checkedInToday = attendances.some(a => new Date(a.checkInTime).toISOString().split('T')[0] === todayStr);

    const uniqueAttendanceDays = Array.from(new Set(
      attendances.map(a => new Date(a.checkInTime).toISOString().split('T')[0])
    )).sort().reverse();

    const attendanceDaysSet = new Set(uniqueAttendanceDays);

    let currentStreak = 0;
    const streakCheckDate = new Date();
    if (!checkedInToday) {
      streakCheckDate.setDate(streakCheckDate.getDate() - 1);
    }
    while (true) {
      const d = streakCheckDate.toISOString().split('T')[0];
      if (attendanceDaysSet.has(d)) {
        currentStreak++;
        streakCheckDate.setDate(streakCheckDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Longest streak calculation
    let longestStreak = currentStreak;
    if (uniqueAttendanceDays.length > 0) {
      const sortedAsc = [...uniqueAttendanceDays].sort();
      let tempStreak = 1;
      for (let i = 1; i < sortedAsc.length; i++) {
        const prev = new Date(sortedAsc[i - 1]);
        const curr = new Date(sortedAsc[i]);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
    }

    // Calculate Personal Records from completed workouts
    const prMap = new Map<string, { exercise: string; maxWeight: string; weightNum: number; date: string }>();
    const completedWorkouts = workouts.filter(w => w.status === 'COMPLETED');
    for (const w of completedWorkouts) {
      if (!w.exercises) continue;
      try {
        const exs = JSON.parse(w.exercises);
        if (Array.isArray(exs)) {
          for (const ex of exs) {
            if (ex && ex.name && ex.weight) {
              const match = String(ex.weight).match(/(\d+(\.\d+)?)/);
              if (match) {
                const num = parseFloat(match[1]);
                const existing = prMap.get(ex.name);
                if (!existing || num > existing.weightNum) {
                  prMap.set(ex.name, {
                    exercise: ex.name,
                    maxWeight: ex.weight,
                    weightNum: num,
                    date: w.scheduledDate,
                  });
                }
              }
            }
          }
        }
      } catch {}
    }
    const personalRecords = Array.from(prMap.values()).map(({ exercise, maxWeight, date }) => ({
      exercise,
      maxWeight,
      date,
    }));

    // Calculate Achievements deterministically from backend state
    const achievements: any[] = [];
    if (attendances.length >= 1) {
      const firstAtt = attendances[attendances.length - 1];
      achievements.push({
        id: 'ach-first-visit',
        title: 'First Step',
        description: 'Completed your very first gym check-in.',
        icon: 'trophy',
        unlocked: true,
        unlockedAt: firstAtt.checkInTime,
        category: 'Attendance',
        tier: 'Bronze',
      });
    } else {
      achievements.push({
        id: 'ach-first-visit',
        title: 'First Step',
        description: 'Complete your first gym check-in.',
        icon: 'trophy',
        unlocked: false,
        category: 'Attendance',
        tier: 'Bronze',
      });
    }

    if (longestStreak >= 5 || currentStreak >= 5) {
      achievements.push({
        id: 'ach-streak-5',
        title: 'Consistent Mover',
        description: 'Crushed a 5-day continuous gym attendance streak.',
        icon: 'flame',
        unlocked: true,
        unlockedAt: attendances[0]?.checkInTime,
        category: 'Consistency',
        tier: 'Silver',
      });
    } else {
      achievements.push({
        id: 'ach-streak-5',
        title: 'Consistent Mover',
        description: 'Achieve a 5-day continuous attendance streak.',
        icon: 'flame',
        unlocked: false,
        progress: `${currentStreak}/5 days`,
        category: 'Consistency',
        tier: 'Silver',
      });
    }

    if (longestStreak >= 7 || currentStreak >= 7) {
      achievements.push({
        id: 'ach-streak-7',
        title: 'Iron Discipline',
        description: 'Maintained a full 7-day gym consistency streak.',
        icon: 'flame',
        unlocked: true,
        unlockedAt: attendances[0]?.checkInTime,
        category: 'Consistency',
        tier: 'Gold',
      });
    } else {
      achievements.push({
        id: 'ach-streak-7',
        title: 'Iron Discipline',
        description: 'Maintain a full 7-day attendance streak.',
        icon: 'flame',
        unlocked: false,
        progress: `${currentStreak}/7 days`,
        category: 'Consistency',
        tier: 'Gold',
      });
    }

    if (completedWorkouts.length >= 1) {
      achievements.push({
        id: 'ach-workout-first',
        title: 'Session Finisher',
        description: 'Completed an entire assigned workout routine.',
        icon: 'dumbbell',
        unlocked: true,
        unlockedAt: completedWorkouts[completedWorkouts.length - 1]?.createdAt,
        category: 'Workouts',
        tier: 'Bronze',
      });
    } else {
      achievements.push({
        id: 'ach-workout-first',
        title: 'Session Finisher',
        description: 'Complete your first assigned workout routine.',
        icon: 'dumbbell',
        unlocked: false,
        category: 'Workouts',
        tier: 'Bronze',
      });
    }

    if (completedWorkouts.length >= 10) {
      achievements.push({
        id: 'ach-workout-10',
        title: 'Decathlon Athlete',
        description: 'Completed 10 full workout routines.',
        icon: 'sparkles',
        unlocked: true,
        unlockedAt: completedWorkouts[0]?.createdAt,
        category: 'Workouts',
        tier: 'Gold',
      });
    } else {
      achievements.push({
        id: 'ach-workout-10',
        title: 'Decathlon Athlete',
        description: 'Complete 10 full workout routines.',
        icon: 'sparkles',
        unlocked: false,
        progress: `${completedWorkouts.length}/10 routines`,
        category: 'Workouts',
        tier: 'Gold',
      });
    }

    const hasHeavyPr = personalRecords.some(p => {
      const match = p.maxWeight.match(/(\d+(\.\d+)?)/);
      return match && parseFloat(match[1]) >= 75;
    });

    if (hasHeavyPr || posts.some(p => p.postType === 'ACHIEVEMENT')) {
      achievements.push({
        id: 'ach-pr-crusher',
        title: 'Heavy Lifter',
        description: 'Logged a major strength lift or milestone PR.',
        icon: 'award',
        unlocked: true,
        unlockedAt: completedWorkouts[0]?.createdAt || posts[0]?.createdAt,
        category: 'Strength',
        tier: 'Gold',
      });
    }

    if (posts.length >= 1) {
      achievements.push({
        id: 'ach-community-voice',
        title: 'Community Voice',
        description: 'Shared progress or motivated fellow members on the gym wall.',
        icon: 'users',
        unlocked: true,
        unlockedAt: posts[posts.length - 1]?.createdAt,
        category: 'Community',
        tier: 'Bronze',
      });
    }

    if (memberMemberships.length >= 1) {
      const activeOrAnnual = memberMemberships.some(ms => ms.planName.toLowerCase().includes('annual') || ms.status === 'Active');
      if (activeOrAnnual) {
        achievements.push({
          id: 'ach-committed-athlete',
          title: 'Dedicated Member',
          description: 'Enrolled in an active gym pass for sustained fitness results.',
          icon: 'shield-check',
          unlocked: true,
          unlockedAt: memberMemberships[0]?.startDate,
          category: 'Membership',
          tier: 'Silver',
        });
      }
    }

    // Build timeline items from records
    const allActivities: any[] = [];

    // 1. Attendance events
    for (const a of attendances) {
      const dateStr = a.checkInTime.toISOString().split('T')[0];
      allActivities.push({
        id: `att-${a.id}`,
        type: 'ATTENDANCE',
        date: dateStr,
        timestamp: a.checkInTime.toISOString(),
        title: 'Gym Check-in',
        subtitle: `${new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${a.checkInMethod === 'QR' ? 'Front-Desk QR Terminal' : 'Self-Service Pass'}`,
        status: 'VERIFIED',
        badge: 'Attendance',
        metadata: {
          attendanceId: a.id,
          checkInMethod: a.checkInMethod,
          notes: a.notes,
        },
      });
    }

    // 2. Workout events
    for (const w of workouts) {
      let exCount = 0;
      let completedExCount = 0;
      try {
        const exs = JSON.parse(w.exercises || '[]');
        exCount = exs.length;
        completedExCount = exs.filter((e: any) => e.completed).length;
      } catch {}

      const pct = exCount > 0 ? Math.round((completedExCount / exCount) * 100) : 0;
      const isPastOrToday = w.scheduledDate <= todayStr;
      const isCompleted = w.status === 'COMPLETED';

      allActivities.push({
        id: `wkt-${w.id}`,
        type: 'WORKOUT',
        date: w.scheduledDate,
        timestamp: w.updatedAt ? w.updatedAt.toISOString() : `${w.scheduledDate}T10:00:00.000Z`,
        title: isCompleted ? `Workout: ${w.title}` : (isPastOrToday ? `Assigned: ${w.title}` : `Upcoming: ${w.title}`),
        subtitle: isCompleted
          ? `${completedExCount}/${exCount} exercises completed • 100% finished`
          : (isPastOrToday ? `${exCount} exercises planned • In Progress` : `Scheduled session • ${exCount} exercises`),
        status: w.status,
        badge: isCompleted ? 'Completed' : (isPastOrToday ? 'Assigned' : 'Upcoming'),
        metadata: {
          workoutId: w.id,
          title: w.title,
          description: w.description,
          scheduledDate: w.scheduledDate,
          status: w.status,
          exercises: w.exercises,
          notes: w.notes,
          completionPercentage: pct,
        },
      });
    }

    // 3. Payment events
    for (const p of memberPayments) {
      const pDate = p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate);
      const dateStr = pDate.toISOString().split('T')[0];
      allActivities.push({
        id: `pay-${p.id}`,
        type: 'PAYMENT',
        date: dateStr,
        timestamp: pDate.toISOString(),
        title: `Payment: ₹${parseFloat(p.amount).toLocaleString('en-IN')}`,
        subtitle: `Receipt #${p.receiptNumber} via ${p.paymentMethod} • Status: ${p.status}`,
        status: p.status.toUpperCase(),
        badge: 'Payment',
        metadata: {
          paymentId: p.id,
          receiptNumber: p.receiptNumber,
          amount: parseFloat(p.amount),
          paymentMethod: p.paymentMethod,
          status: p.status,
          paymentDate: pDate.toISOString(),
          notes: p.notes,
          membershipId: p.membershipId,
        },
      });
    }

    // 4. Membership events
    for (const ms of memberMemberships) {
      allActivities.push({
        id: `ms-${ms.id}`,
        type: 'MEMBERSHIP',
        date: ms.startDate,
        timestamp: `${ms.startDate}T09:00:00.000Z`,
        title: `${ms.planName}`,
        subtitle: `Valid until ${ms.endDate} (₹${parseFloat(ms.price).toLocaleString('en-IN')}) • ${ms.status}`,
        status: ms.status.toUpperCase(),
        badge: 'Membership',
        metadata: {
          membershipId: ms.id,
          planName: ms.planName,
          startDate: ms.startDate,
          endDate: ms.endDate,
          price: parseFloat(ms.price),
          status: ms.status,
        },
      });
    }

    // 5. Community events
    for (const cp of posts) {
      const dateStr = cp.createdAt.toISOString().split('T')[0];
      allActivities.push({
        id: `post-${cp.id}`,
        type: 'COMMUNITY',
        date: dateStr,
        timestamp: cp.createdAt.toISOString(),
        title: cp.postType === 'ACHIEVEMENT' ? 'PR / Milestone Post' : 'Community Wall Post',
        subtitle: `"${cp.content.slice(0, 60)}${cp.content.length > 60 ? '...' : ''}" • ❤️ ${cp.likesCount} • 💬 ${cp.commentsCount}`,
        status: 'POSTED',
        badge: 'Community',
        metadata: {
          postId: cp.id,
          content: cp.content,
          mediaUrl: cp.mediaUrl,
          postType: cp.postType,
          likesCount: cp.likesCount,
          commentsCount: cp.commentsCount,
        },
      });
    }

    // 6. Unlocked Achievements as events on timeline
    for (const ach of achievements.filter(a => a.unlocked)) {
      const achDate = ach.unlockedAt ? new Date(ach.unlockedAt).toISOString().split('T')[0] : todayStr;
      allActivities.push({
        id: `ach-${ach.id}`,
        type: 'ACHIEVEMENT',
        date: achDate,
        timestamp: ach.unlockedAt ? new Date(ach.unlockedAt).toISOString() : new Date().toISOString(),
        title: `Achievement Unlocked: ${ach.title}`,
        subtitle: ach.description,
        status: 'UNLOCKED',
        badge: ach.tier || 'Badge',
        metadata: ach,
      });
    }

    // Sort chronologically descending
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Generate Calendar Days Map (dates with activities)
    const calendarDays: Record<string, { attendance: boolean; workout: boolean; payment: boolean; community: boolean; achievement: boolean; count: number }> = {};
    for (const act of allActivities) {
      if (!calendarDays[act.date]) {
        calendarDays[act.date] = { attendance: false, workout: false, payment: false, community: false, achievement: false, count: 0 };
      }
      calendarDays[act.date].count++;
      if (act.type === 'ATTENDANCE') calendarDays[act.date].attendance = true;
      if (act.type === 'WORKOUT') calendarDays[act.date].workout = true;
      if (act.type === 'PAYMENT') calendarDays[act.date].payment = true;
      if (act.type === 'COMMUNITY') calendarDays[act.date].community = true;
      if (act.type === 'ACHIEVEMENT') calendarDays[act.date].achievement = true;
    }

    // Generate This Week breakdown (Monday through Sunday)
    const curr = new Date();
    const currentDay = curr.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const thisWeek = weekDays.map((name, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const dStr = d.toISOString().split('T')[0];
      const hasAttendance = attendances.some(a => new Date(a.checkInTime).toISOString().split('T')[0] === dStr);
      const dayWorkout = workouts.find(w => w.scheduledDate === dStr);

      let label = '—';
      if (hasAttendance && dayWorkout?.status === 'COMPLETED') {
        label = `✓ Check-in & Workout`;
      } else if (hasAttendance) {
        label = '✓ Gym Check-in';
      } else if (dayWorkout?.status === 'COMPLETED') {
        label = `✓ ${dayWorkout.title}`;
      } else if (dayWorkout) {
        label = dayWorkout.title;
      } else if (dStr < todayStr) {
        label = 'Rest Day';
      }

      return {
        day: name,
        date: dStr,
        isToday: dStr === todayStr,
        hasAttendance,
        workout: dayWorkout || null,
        label,
      };
    });

    // Filtering
    let filteredActivities = allActivities;

    if (type && type !== 'ALL') {
      filteredActivities = filteredActivities.filter(a => a.type === String(type).toUpperCase());
    }

    if (date) {
      filteredActivities = filteredActivities.filter(a => a.date === String(date));
    } else {
      if (from) {
        filteredActivities = filteredActivities.filter(a => a.date >= String(from));
      }
      if (to) {
        filteredActivities = filteredActivities.filter(a => a.date <= String(to));
      }
    }

    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      filteredActivities = filteredActivities.filter(a => 
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.date.includes(q) ||
        (a.metadata?.exercises && String(a.metadata.exercises).toLowerCase().includes(q)) ||
        (a.metadata?.description && String(a.metadata.description).toLowerCase().includes(q)) ||
        (a.metadata?.notes && String(a.metadata.notes).toLowerCase().includes(q)) ||
        (a.metadata?.content && String(a.metadata.content).toLowerCase().includes(q)) ||
        (a.metadata?.receiptNumber && String(a.metadata.receiptNumber).toLowerCase().includes(q))
      );
    }

    // Pagination calculation: safe handling of offset, page, and limit up to 500 records
    const totalCount = filteredActivities.length;
    const parsedLimit = req.query.limit !== undefined ? parseInt(String(req.query.limit), 10) : 100;
    const limitNum = isNaN(parsedLimit) || parsedLimit <= 0 ? 100 : Math.min(parsedLimit, 500);

    const parsedOffset = req.query.offset !== undefined ? parseInt(String(req.query.offset), 10) : NaN;
    const parsedPage = req.query.page !== undefined ? parseInt(String(req.query.page), 10) : NaN;

    let offsetNum = 0;
    if (!isNaN(parsedOffset) && parsedOffset >= 0) {
      offsetNum = parsedOffset;
    } else if (!isNaN(parsedPage) && parsedPage >= 1) {
      offsetNum = (parsedPage - 1) * limitNum;
    }

    const limitedActivities = filteredActivities.slice(offsetNum, offsetNum + limitNum);
    const hasMore = offsetNum + limitedActivities.length < totalCount;

    // Summary calculations
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const thisMonthCheckins = attendances.filter(a => new Date(a.checkInTime) >= startOfMonth).length;

    const totalSpent = memberPayments.reduce((acc, p) => acc + parseFloat(p.amount || '0'), 0);
    const completionRate = workouts.length > 0 ? Math.round((completedWorkouts.length / workouts.length) * 100) : 0;

    res.json({
      activities: limitedActivities,
      totalActivitiesCount: totalCount,
      hasMore,
      limit: limitNum,
      offset: offsetNum,
      page: Math.floor(offsetNum / limitNum) + 1,
      summary: {
        totalCheckins: attendances.length,
        thisMonthCheckins,
        currentStreak,
        longestStreak,
        checkedInToday,
        totalWorkouts: workouts.length,
        completedWorkouts: completedWorkouts.length,
        completionRate,
        totalPayments: memberPayments.length,
        totalSpent,
        personalRecordsCount: personalRecords.length,
        unlockedAchievementsCount: achievements.filter(a => a.unlocked).length,
        totalAchievementsCount: achievements.length,
      },
      thisWeek,
      calendarDays,
      personalRecords,
      achievements,
      attendanceHistory: attendances.slice(0, 50),
      workoutHistory: workouts.slice(0, 50),
      paymentHistory: memberPayments.slice(0, 50),
      membershipHistory: memberMemberships,
    });
  } catch (error: any) {
    console.error('Error fetching member activity:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load member activity' } });
  }
});

// GET /api/member/activity/calendar - Fast Month Activity Summary Mapping
router.get('/activity/calendar', requireAuth, requireLinkedMember, async (req: AuthRequest, res: Response) => {
  try {
    const member = (req as any).member;
    const gymId = req.user!.gymId;
    const { month } = req.query; // YYYY-MM

    const [attendances, workouts, paymentsList] = await Promise.all([
      db.query.memberAttendance.findMany({
        where: and(eq(memberAttendance.memberId, member.id), eq(memberAttendance.gymId, gymId)),
      }),
      db.query.memberWorkouts.findMany({
        where: and(eq(memberWorkouts.memberId, member.id), eq(memberWorkouts.gymId, gymId)),
      }),
      db.query.payments.findMany({
        where: and(eq(payments.memberId, member.id), eq(payments.gymId, gymId)),
      }),
    ]);

    const daysMap: Record<string, { date: string; attendance: boolean; workout: boolean; payment: boolean; count: number }> = {};

    for (const a of attendances) {
      const d = a.checkInTime.toISOString().split('T')[0];
      if (!daysMap[d]) daysMap[d] = { date: d, attendance: false, workout: false, payment: false, count: 0 };
      daysMap[d].attendance = true;
      daysMap[d].count++;
    }

    for (const w of workouts) {
      const d = w.scheduledDate;
      if (!daysMap[d]) daysMap[d] = { date: d, attendance: false, workout: false, payment: false, count: 0 };
      daysMap[d].workout = true;
      daysMap[d].count++;
    }

    for (const p of paymentsList) {
      const pDate = p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate);
      const d = pDate.toISOString().split('T')[0];
      if (!daysMap[d]) daysMap[d] = { date: d, attendance: false, workout: false, payment: false, count: 0 };
      daysMap[d].payment = true;
      daysMap[d].count++;
    }

    let results = Object.values(daysMap);
    if (month) {
      results = results.filter(item => item.date.startsWith(String(month)));
    }

    res.json({ days: results });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load activity calendar' } });
  }
});

// POST /api/member/link-account - Link authenticated user to member profile via invitation token
router.post('/link-account', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { invitationToken } = req.body;
    const userId = req.user!.userId;
    const gymId = req.user!.gymId;

    if (!invitationToken) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invitation token is required.' } });
    }

    const cleanToken = String(invitationToken).trim();

    // Query token across members to detect wrong gym vs invalid/expired
    const tokenMember = await db.query.members.findFirst({
      where: eq(members.invitationToken, cleanToken),
    });

    if (!tokenMember) {
      return res.status(404).json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid or unrecognized invitation code. Please ask your gym owner for a fresh invite.' },
      });
    }

    // Cross-tenant verification: check if token belongs to this user's gym
    if (tokenMember.gymId !== gymId) {
      return res.status(403).json({
        error: { 
          code: 'WRONG_GYM', 
          message: 'This invitation code belongs to a different gym and cannot be claimed by your current account.' 
        },
      });
    }

    if (tokenMember.invitationExpiresAt && new Date(tokenMember.invitationExpiresAt) < new Date()) {
      return res.status(400).json({
        error: { code: 'TOKEN_EXPIRED', message: 'This invitation code has expired. Please request a new one from your gym.' },
      });
    }

    if (tokenMember.accountStatus === 'SUSPENDED') {
      return res.status(403).json({
        error: { code: 'MEMBER_SUSPENDED', message: 'Cannot claim invitation: member account is suspended. Please contact gym administration.' },
      });
    }

    if (tokenMember.status === 'ARCHIVED' || tokenMember.status === 'DEACTIVATED') {
      return res.status(403).json({
        error: { code: 'MEMBER_ARCHIVED', message: 'Cannot claim invitation: member account is archived. Please contact gym administration.' },
      });
    }

    // Unlink any prior member record previously assigned to this user to ensure clean 1:1 binding
    await db.update(members)
      .set({ userId: null, updatedAt: new Date() })
      .where(and(eq(members.userId, userId), ne(members.id, tokenMember.id)));

    // Link user atomically
    const [linked] = await db.update(members)
      .set({
        userId,
        accountStatus: 'ACTIVE',
        invitationToken: null, // Consume single-use token
        invitationExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(members.id, tokenMember.id))
      .returning();

    // Update user profile role to MEMBER
    await db.update(userProfiles)
      .set({ 
        role: 'MEMBER', 
        name: tokenMember.name, 
        updatedAt: new Date() 
      })
      .where(eq(userProfiles.id, userId));

    await logAuditEvent({
      gymId,
      userId,
      action: 'MEMBER_LINKED',
      entityType: 'MEMBER',
      entityId: linked.id,
      details: `User linked to member ${linked.name} (${linked.memberCode}) via invitation code.`,
    });

    res.json({
      success: true,
      member: linked,
    });
  } catch (error: any) {
    console.error('Error linking member account:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to link member account' } });
  }
});

export default router;
