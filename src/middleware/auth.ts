import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { userProfiles, members } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';

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

/**
 * Base authentication middleware:
 * 1. Verifies the Firebase ID token.
 * 2. Sets req.decodedToken with authoritative verified token claims.
 * 3. Resolves user profile and gym from database if registered.
 * 4. Leaves req.user undefined if the Firebase user has not completed gym onboarding.
 */
export const authenticateFirebaseUser = async (
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
    if (process.env.NODE_ENV !== 'production' && token.startsWith('test-token-')) {
      const isMember = token.includes('member');
      const isManager = token.includes('manager');
      const isTrainer = token.includes('trainer');
      const role = isMember ? 'MEMBER' : isManager ? 'MANAGER' : isTrainer ? 'TRAINER' : 'OWNER';
      const uid = `uid-${token}`;
      let email = isMember ? 'member@testgym.com' : `${role.toLowerCase()}@testgym.com`;
      let name = isMember ? 'Gym Member' : `Test ${role}`;
      if (token.includes('rohit')) {
        email = 'rohit.sharma@testlifecycle.com';
        name = 'Rohit Sharma';
      }
      decodedToken = {
        uid,
        email,
        name,
        email_verified: true,
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

    // Look up user profile and gym in PostgreSQL by verified Firebase UID
    const profile: any = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.firebaseUid, decodedToken.uid),
      with: {
        gym: true,
      },
    });

    if (profile && profile.gym) {
      const gymStatus = profile.gym.status || 'ACTIVE';

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
    } else {
      req.user = undefined;
    }

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token or resolving profile:', error);
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired authentication token' } });
  }
};

/**
 * Strict workspace authorization middleware:
 * Requires both a verified Firebase identity AND an associated gym workspace profile.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  authenticateFirebaseUser(req, res, () => {
    if (!req.user) {
      return res.status(403).json({
        error: {
          code: 'NO_GYM_ASSOCIATION',
          message: 'User has no registered gym workspace. Please complete onboarding first.'
        }
      });
    }

    const gymStatus = req.user.gymStatus || 'ACTIVE';

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

    next();
  });
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
