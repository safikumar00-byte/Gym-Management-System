import { Router, type Response } from 'express';
import { authenticateFirebaseUser, requireAuth, type AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { gyms, userProfiles, gymCounters, membershipPlans, members } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit.ts';

const router = Router();

export type OnboardingState = 
  | 'AUTHENTICATED_NEEDS_GYM'
  | 'READY'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'GYM_INACTIVE'
  | 'GYM_SUSPENDED';

// POST /api/auth/register-gym - Self-service gym generation & owner onboarding
// Requires verified Firebase token; binds newly created workspace to the authoritative Firebase UID
router.post('/register-gym', authenticateFirebaseUser, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.decodedToken) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to register a gym workspace.' }
      });
    }

    const firebaseUid = req.decodedToken.uid;
    const verifiedEmail = req.decodedToken.email;

    // 1. Idempotency Check: Does this Firebase user already have a registered gym workspace?
    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.firebaseUid, firebaseUid),
      with: { gym: true },
    });

    if (existingProfile && existingProfile.gym) {
      return res.json({
        gym: existingProfile.gym,
        user: existingProfile,
        onboardingState: 'READY' as OnboardingState,
        message: 'Workspace already registered for this account.',
      });
    }

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

    const normalizedOwnerName = String(ownerName || req.decodedToken.name || '').trim();
    const normalizedOwnerEmail = String(verifiedEmail || ownerEmail || '').trim().toLowerCase();

    if (!gymName || !normalizedOwnerName || !normalizedOwnerEmail) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Gym name, owner name, and owner email are required.' }
      });
    }

    // 2. Transactional Workspace & Owner Provisioning
    const result = await db.transaction(async (tx) => {
      // Re-verify inside transaction to guard against concurrent submissions
      const inTxCheck = await tx.query.userProfiles.findFirst({
        where: eq(userProfiles.firebaseUid, firebaseUid),
        with: { gym: true },
      });
      if (inTxCheck && inTxCheck.gym) {
        return { gym: inTxCheck.gym, user: inTxCheck, onboardingState: 'READY' as OnboardingState };
      }

      const [newGym] = await tx.insert(gyms).values({
        name: String(gymName).trim(),
        phone: phone ? String(phone).trim() : (ownerPhone ? String(ownerPhone).trim() : ''),
        email: email ? String(email).trim() : normalizedOwnerEmail,
        address: address ? String(address).trim() : '',
        upiId: upiId ? String(upiId).trim() : '',
        currency: String(currency).trim().toUpperCase() || 'INR',
        receiptPrefix: String(receiptPrefix).trim().toUpperCase() || 'GM-',
        receiptFooter: receiptFooter || 'Thank you for training with us! Fees once paid are non-refundable.',
        status: 'ACTIVE',
      }).returning();

      await tx.insert(gymCounters).values({
        gymId: newGym.id,
        memberSequence: 0,
        receiptSequence: 0,
      }).onConflictDoNothing();

      const [newProfile] = await tx.insert(userProfiles).values({
        firebaseUid, // Authoritative real Firebase UID from token
        gymId: newGym.id,
        name: normalizedOwnerName,
        email: normalizedOwnerEmail,
        role: 'OWNER',
      }).returning();

      // Seed starter membership plans for the new gym
      await tx.insert(membershipPlans).values([
        {
          gymId: newGym.id,
          name: 'Monthly Core',
          durationMonths: 1,
          durationDays: 30,
          price: '1500.00',
          description: 'Standard 1-month fitness & gym floor access',
          active: true,
        },
        {
          gymId: newGym.id,
          name: 'Quarterly Power',
          durationMonths: 3,
          durationDays: 90,
          price: '3800.00',
          description: '3-month quarterly membership with locker & cardio access',
          active: true,
        },
        {
          gymId: newGym.id,
          name: 'Annual Elite',
          durationMonths: 12,
          durationDays: 365,
          price: '12000.00',
          description: 'Full 1-year unlimited access with diet consultation',
          active: true,
        },
      ]).onConflictDoNothing();

      await logAuditEvent({
        gymId: newGym.id,
        userId: newProfile.id,
        action: 'USER_PROVISIONED',
        entityType: 'GYM',
        entityId: newGym.id,
        details: `Workspace '${newGym.name}' registered by owner '${newProfile.name}' (UID: ${firebaseUid})`,
        tx,
      });

      return { gym: newGym, user: newProfile, onboardingState: 'READY' as OnboardingState };
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/auth/register-gym:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate gym and owner account' } });
  }
});

// GET /api/auth/me - Authoritative identity and onboarding state resolver
router.get('/me', authenticateFirebaseUser, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.decodedToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    // Case 1: User has a registered workspace profile
    if (req.user) {
      const gymId = req.user.gymId;
      const gym = await db.query.gyms.findFirst({
        where: eq(gyms.id, gymId),
      });

      let member: any = null;
      if (req.user.memberId || req.user.role === 'MEMBER') {
        member = await db.query.members.findFirst({
          where: and(
            eq(members.gymId, gymId),
            req.user.memberId ? eq(members.id, req.user.memberId) : eq(members.userId, req.user.userId)
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

      const gymStatus = req.user.gymStatus || gym?.status || 'ACTIVE';
      let onboardingState: OnboardingState = 'READY';
      if (gymStatus === 'DEACTIVATED') {
        onboardingState = 'GYM_INACTIVE';
      } else if (gymStatus === 'SUSPENDED') {
        onboardingState = 'GYM_SUSPENDED';
      }

      return res.json({
        user: req.user,
        gym,
        member,
        applicationRole: req.user.role,
        onboardingState,
      });
    }

    // Case 2: User is authenticated with Firebase, but has no gym association yet
    const isEmailVerified = req.decodedToken.email_verified || req.decodedToken.firebase?.sign_in_provider === 'google.com';
    const onboardingState: OnboardingState = isEmailVerified ? 'AUTHENTICATED_NEEDS_GYM' : 'EMAIL_VERIFICATION_REQUIRED';

    return res.json({
      user: null,
      gym: null,
      member: null,
      applicationRole: null,
      onboardingState,
      firebaseUser: {
        uid: req.decodedToken.uid,
        email: req.decodedToken.email || null,
        name: req.decodedToken.name || null,
      },
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

export default router;
