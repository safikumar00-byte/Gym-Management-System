import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { userProfiles, gyms, gymCounters, membershipPlans, members } from '../db/schema.ts';
import { eq, and, ne } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit.ts';
import { seedOrResetDemoMember, DEMO_MEMBER_ID, DEMO_GYM_ID } from '../lib/demo-member.ts';

export type UserRole = 'OWNER' | 'MANAGER' | 'TRAINER' | 'MEMBER';

export interface AuthenticatedUser {
  firebaseUid: string;
  userId: string;
  gymId: string;
  role: string;
  name: string;
  email: string | null;
  gymStatus?: string;
  memberId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  decodedToken?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or malformed authorization token' } });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    let decodedToken: DecodedIdToken;
    if (token === 'test-token-demo-member' || token.includes('demo-member')) {
      decodedToken = {
        uid: 'uid-demo-member-alex',
        email: 'demo-member@demo.rawpowergym.app',
        name: 'Alex Johnson',
        auth_time: Math.floor(Date.now() / 1000),
        iss: 'https://securetoken.google.com/test',
        sub: 'uid-demo-member-alex',
        aud: 'test',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 * 24,
        firebase: { identities: {}, sign_in_provider: 'custom' },
      } as DecodedIdToken;
    } else if (process.env.NODE_ENV !== 'production' && token.startsWith('test-token-')) {
      const isMember = token.includes('member');
      const isManager = token.includes('manager');
      const isTrainer = token.includes('trainer');
      const role = isMember ? 'MEMBER' : isManager ? 'MANAGER' : isTrainer ? 'TRAINER' : 'OWNER';
      const uid = `uid-${token}`;
      let email = isMember ? 'member@testgym.com' : `${role.toLowerCase()}@testgym.com`;
      let name = isMember ? 'Aditya Verma (Member)' : `Test ${role}`;
      if (token.includes('rohit')) {
        email = 'rohit.sharma@testlifecycle.com';
        name = 'Rohit Sharma';
      }
      decodedToken = {
        uid,
        email,
        name,
        auth_time: Math.floor(Date.now() / 1000),
        iss: 'https://securetoken.google.com/test',
        sub: uid,
        aud: 'test',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        firebase: { identities: {}, sign_in_provider: 'custom' },
      } as DecodedIdToken;
    } else {
      decodedToken = await adminAuth.verifyIdToken(token);
    }
    req.decodedToken = decodedToken;

    // Special handling for Demo Member: ensure isolated tenant is initialized
    if (decodedToken.uid === 'uid-demo-member-alex') {
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

      req.user = {
        firebaseUid: decodedToken.uid,
        userId: demoProfile.id,
        gymId: demoProfile.gymId,
        role: 'MEMBER',
        name: demoProfile.name,
        email: demoProfile.email,
        gymStatus: 'ACTIVE',
        memberId: DEMO_MEMBER_ID,
      };

      return next();
    }

    // Look up user profile and gym in PostgreSQL
    let profile: any = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.firebaseUid, decodedToken.uid),
      with: {
        gym: true,
      },
    });

    // If user does not exist in DB yet, auto-provision their profile atomically
    if (!profile) {
      try {
        profile = await db.transaction(async (tx) => {
          // Double check inside transaction in case another request completed onboarding concurrently
          const existingInTx = await tx.query.userProfiles.findFirst({
            where: eq(userProfiles.firebaseUid, decodedToken.uid),
            with: { gym: true },
          });
          if (existingInTx) return existingInTx;

          const isMember = decodedToken.uid.includes('member');
          const isManager = decodedToken.uid.includes('manager');
          const isTrainer = decodedToken.uid.includes('trainer');
          const assignedRole = isMember ? 'MEMBER' : isManager ? 'MANAGER' : isTrainer ? 'TRAINER' : 'OWNER';

          // For members, managers, and trainers, attach to matching gym if specified or available
          let targetGym: any = null;
          if (decodedToken.uid.includes('gym-a')) {
            const ownerAProfile = await tx.query.userProfiles.findFirst({
              where: eq(userProfiles.firebaseUid, 'uid-test-token-owner-gym-a'),
            });
            if (ownerAProfile) {
              targetGym = await tx.query.gyms.findFirst({
                where: eq(gyms.id, ownerAProfile.gymId),
              });
            }
          }

          if (!targetGym && (isMember || isManager || isTrainer) && !decodedToken.uid.includes('tenant2')) {
            targetGym = await tx.query.gyms.findFirst({
              where: ne(gyms.id, DEMO_GYM_ID),
            });
          }

          if (!targetGym) {
            // Safe multi-tenant onboarding: Every new owner provisions a dedicated new gym
            const gymName = decodedToken.uid.includes('tenant2')
              ? 'Tenant B Fitness'
              : (decodedToken.name ? `${decodedToken.name}'s Gym` : 'My Fitness Gym');
            const [newGym] = await tx.insert(gyms).values({
              name: gymName,
              phone: '',
              email: decodedToken.email || '',
              address: '',
              upiId: '',
              gstNumber: '',
              currency: 'INR',
              timezone: 'Asia/Kolkata',
              receiptPrefix: decodedToken.uid.includes('tenant2') ? 'TB-' : 'GM-',
              receiptFooter: 'Thank you for training with us! Fees once paid are non-refundable.',
              status: 'ACTIVE',
            }).returning();

            targetGym = newGym;

            // Initialize atomic sequence counters for this new gym
            await tx.insert(gymCounters).values({
              gymId: targetGym.id,
              memberSequence: 0,
              receiptSequence: 0,
            }).onConflictDoNothing();

            // Seed default plans for the new gym
            await tx.insert(membershipPlans).values([
              {
                gymId: targetGym.id,
                name: '1 Month General Fitness',
                durationMonths: 1,
                durationDays: 30,
                price: '2500.00',
                description: 'Access to general gym floor and cardio zone during operating hours.',
                active: true,
              },
              {
                gymId: targetGym.id,
                name: '3 Months Strength Pass',
                durationMonths: 3,
                durationDays: 90,
                price: '6500.00',
                description: 'Quarterly membership including basic fitness assessment.',
                active: true,
              },
            ]);
          }

          // Create user profile pointing strictly to target gym
          const [newProfile] = await tx.insert(userProfiles).values({
            firebaseUid: decodedToken.uid,
            gymId: targetGym.id,
            name: decodedToken.name || decodedToken.email?.split('@')[0] || (isMember ? 'Gym Member' : 'Gym User'),
            email: decodedToken.email || null,
            role: assignedRole,
          }).returning();

          // If assignedRole is MEMBER, link only if matching email exists
          if (assignedRole === 'MEMBER' && decodedToken.email) {
            const matchedMember = await tx.query.members.findFirst({
              where: and(eq(members.gymId, targetGym.id), eq(members.email, decodedToken.email)),
            });
            if (matchedMember) {
              await tx.update(members)
                .set({ userId: newProfile.id, accountStatus: 'ACTIVE', updatedAt: new Date() })
                .where(eq(members.id, matchedMember.id));
            }
          }

          await logAuditEvent({
            gymId: targetGym.id,
            userId: newProfile.id,
            action: 'USER_PROVISIONED',
            entityType: 'USER',
            entityId: newProfile.id,
            details: `Profile provisioned with role ${assignedRole} for UID: ${decodedToken.uid}`,
            tx,
          });

          return {
            ...newProfile,
            gym: targetGym,
          };
        });
      } catch (raceError) {
        // Concurrency safety: If another concurrent request inserted profile, fetch it now
        profile = await db.query.userProfiles.findFirst({
          where: eq(userProfiles.firebaseUid, decodedToken.uid),
          with: { gym: true },
        });
        if (!profile) {
          throw raceError;
        }
      }
    }

    const gymStatus = profile.gym?.status || 'ACTIVE';

    // Gym lifecycle check
    if (gymStatus === 'DEACTIVATED') {
      return res.status(403).json({ 
        error: { 
          code: 'GYM_DEACTIVATED', 
          message: 'This gym account has been deactivated. Please contact support or the gym owner.' 
        } 
      });
    }

    if (gymStatus === 'SUSPENDED' && req.method !== 'GET') {
      return res.status(403).json({ 
        error: { 
          code: 'GYM_SUSPENDED', 
          message: 'This gym account is currently suspended. Modifications are restricted.' 
        } 
      });
    }

    // Resolve linked member record if any
    const linkedMember = await db.query.members.findFirst({
      where: and(eq(members.userId, profile.id), eq(members.gymId, profile.gymId)),
      orderBy: (m, { desc }) => [desc(m.updatedAt)],
    });

    req.user = {
      firebaseUid: decodedToken.uid,
      userId: profile.id,
      gymId: profile.gymId,
      role: (profile.role || 'OWNER').toUpperCase(),
      name: profile.name,
      email: profile.email,
      gymStatus,
      memberId: linkedMember?.id,
    };

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token or resolving profile:', error);
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired authentication token' } });
  }
};

/**
 * Role-based authorization middleware enforcing server-side permissions
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ 
        error: { 
          code: 'FORBIDDEN', 
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}` 
        } 
      });
    }

    next();
  };
};
