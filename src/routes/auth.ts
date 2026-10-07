import { Router, type Response, type Request } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { gyms, userProfiles, gymCounters, membershipPlans, members } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit.ts';
import { seedOrResetDemoMember, DEMO_GYM_ID, DEMO_USER_ID, DEMO_MEMBER_ID } from '../lib/demo-member.ts';

const router = Router();

// POST /api/auth/register-gym - Self-service gym generation & owner onboarding
router.post('/register-gym', async (req: Request, res: Response) => {
  try {
    const { 
      gymName, 
      phone, 
      email, 
      address, 
      upiId, 
      currency = 'INR', 
      receiptPrefix = 'GM-', 
      receiptFooter,
      ownerName,
      ownerEmail,
      ownerPhone
    } = req.body;

    if (!gymName || !ownerName || !ownerEmail) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Gym name, owner name, and owner email are required.' }
      });
    }

    const result = await db.transaction(async (tx) => {
      const [newGym] = await tx.insert(gyms).values({
        name: String(gymName).trim(),
        phone: phone ? String(phone).trim() : '',
        email: email ? String(email).trim() : '',
        address: address ? String(address).trim() : '',
        upiId: upiId ? String(upiId).trim() : '',
        currency: String(currency).trim().toUpperCase() || 'INR',
        receiptPrefix: String(receiptPrefix).trim() || 'GM-',
        receiptFooter: receiptFooter || 'Thank you for training with us! Fees once paid are non-refundable.',
        status: 'ACTIVE',
      }).returning();

      await tx.insert(gymCounters).values({
        gymId: newGym.id,
        memberSequence: 0,
        receiptSequence: 0,
      }).onConflictDoNothing();

      const [newProfile] = await tx.insert(userProfiles).values({
        firebaseUid: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        gymId: newGym.id,
        name: String(ownerName).trim(),
        email: String(ownerEmail).trim().toLowerCase(),
        role: 'OWNER',
      }).returning();

      // Seed starter membership plans for the new gym
      await tx.insert(membershipPlans).values([
        {
          gymId: newGym.id,
          name: 'Monthly Core',
          durationMonths: 1,
          durationDays: 30,
          price: '1500',
          description: 'Standard 1-month fitness & gym floor access',
          active: true,
        },
        {
          gymId: newGym.id,
          name: 'Quarterly Power',
          durationMonths: 3,
          durationDays: 90,
          price: '3800',
          description: '3-month quarterly membership with locker & cardio access',
          active: true,
        },
        {
          gymId: newGym.id,
          name: 'Annual Elite',
          durationMonths: 12,
          durationDays: 365,
          price: '12000',
          description: 'Full 1-year unlimited access with diet consultation',
          active: true,
        },
      ]).onConflictDoNothing();

      return { gym: newGym, user: newProfile };
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/auth/register-gym:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate gym and owner account' } });
  }
});

// GET /api/auth/me - returns authenticated user and gym context
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const gym = await db.query.gyms.findFirst({
      where: eq(gyms.id, gymId),
    });

    let member: any = null;
    if (req.user!.memberId || req.user!.role === 'MEMBER') {
      member = await db.query.members.findFirst({
        where: and(
          eq(members.gymId, gymId),
          req.user!.memberId ? eq(members.id, req.user!.memberId) : eq(members.userId, req.user!.userId)
        ),
        orderBy: (m, { desc }) => [desc(m.updatedAt)],
        with: {
          memberships: {
            orderBy: (ms, { desc }) => [desc(ms.endDate)],
            limit: 1,
          },
        },
      });
    }

    res.json({
      user: req.user,
      gym,
      member,
      applicationRole: req.user!.role,
    });
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve user context' } });
  }
});

// POST /api/auth/sync - sync user profile updates
router.post('/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, role } = req.body;
    const userId = req.user!.userId;
    const currentRole = req.user!.role.toUpperCase();

    const allowedRoles = ['OWNER', 'MANAGER', 'TRAINER'];
    let roleToUpdate: string | undefined = undefined;

    if (role !== undefined) {
      const normalizedRole = String(role).toUpperCase();
      if (!allowedRoles.includes(normalizedRole)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ROLE',
            message: `Invalid role specified. Valid roles are: ${allowedRoles.join(', ')}`,
          },
        });
      }

      // Security check: Only an OWNER can change roles. Non-owners cannot self-promote.
      if (currentRole !== 'OWNER') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only a gym owner can modify user roles or permissions.',
          },
        });
      }

      roleToUpdate = normalizedRole;
    }

    const [updated] = await db.update(userProfiles)
      .set({
        ...(name ? { name: String(name).trim() } : {}),
        ...(roleToUpdate ? { role: roleToUpdate } : {}),
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId))
      .returning();

    if (roleToUpdate && roleToUpdate !== currentRole) {
      await logAuditEvent({
        gymId: req.user!.gymId,
        userId: req.user!.userId,
        action: 'ROLE_CHANGED',
        entityType: 'USER',
        entityId: userId,
        details: `Role updated from ${currentRole} to ${roleToUpdate}`,
      });
    }

    res.json({ user: updated });
  } catch (error: any) {
    console.error('Error in /api/auth/sync:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update user profile' } });
  }
});

// POST /api/auth/demo-member - Dedicated Demo Member Sign-In
router.post('/demo-member', async (req: Request, res: Response) => {
  try {
    let demoProfile: any = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.firebaseUid, 'uid-demo-member-alex'),
      with: { gym: true },
    });

    if (!demoProfile) {
      await seedOrResetDemoMember();
      demoProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.firebaseUid, 'uid-demo-member-alex'),
        with: { gym: true },
      });
    }

    const demoMember = await db.query.members.findFirst({
      where: eq(members.id, DEMO_MEMBER_ID),
    });

    res.json({
      token: 'test-token-demo-member',
      user: {
        userId: demoProfile.id,
        firebaseUid: 'uid-demo-member-alex',
        gymId: demoProfile.gymId,
        role: 'MEMBER',
        name: demoProfile.name,
        email: demoProfile.email,
      },
      gym: demoProfile.gym,
      member: demoMember,
    });
  } catch (error: any) {
    console.error('Error in /api/auth/demo-member:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to initialize demo member session' } });
  }
});

// POST /api/auth/demo-member/reset - Safe Demo Data Reset
router.post('/demo-member/reset', async (req: Request, res: Response) => {
  try {
    const data = await seedOrResetDemoMember();
    res.json({
      success: true,
      message: 'Demo member data restored to pristine state.',
      ...data,
    });
  } catch (error: any) {
    console.error('Error in /api/auth/demo-member/reset:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reset demo member data' } });
  }
});

export default router;
