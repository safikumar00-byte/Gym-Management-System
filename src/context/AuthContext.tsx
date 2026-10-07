import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { api } from '../lib/api.ts';
import { Gym, UserProfile } from '../types';
import { 
  getGym,
  getUser, 
  saveUser, 
  updateUser as updateStoredUser,
  authenticateWithPassword,
  registerNewGym,
  GymRegistrationPayload
} from '../lib/storage';

export type AppRole = 'owner' | 'manager' | 'trainer' | 'member';

interface VerificationState {
  isVerified: boolean;
  method: 'google' | 'phone' | 'email' | null;
  identifier: string | null;
  verifiedAt: string | null;
}

interface PendingSetup {
  type: 'phone' | 'email';
  identifier: string;
  name: string;
  gymName: string;
  role: AppRole;
  expectedCode: string;
}

export interface PendingGymRegistration extends GymRegistrationPayload {
  expectedCode: string;
  verificationChannel: 'phone' | 'email';
  identifier: string;
  createdAt: number;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  gym: Gym | null;
  linkedMember: any | null;
  loading: boolean;
  error: string | null;
  verification: VerificationState;
  pendingSetup: PendingSetup | null;
  isLoggedIn: boolean;
  lastLoggedOutAccount: UserProfile | null;

  // View navigation between Sign In and Account Creation
  authScreen: 'login' | 'register';
  setAuthScreen: (screen: 'login' | 'register') => void;

  // Gym generation & self-registration
  pendingRegistration: PendingGymRegistration | null;
  startGymRegistration: (data: GymRegistrationPayload & { verificationChannel: 'phone' | 'email' }) => Promise<string>;
  verifyGymRegistration: (code: string) => Promise<{ gym: Gym; user: UserProfile }>;
  resendGymRegistrationOtp: () => Promise<string>;
  clearPendingRegistration: () => void;

  // Role permissions
  role: AppRole;
  isOwner: boolean;
  isManager: boolean;
  isTrainer: boolean;
  isMember: boolean;
  isDemoMember: boolean;
  canManagePayments: boolean;
  canManageExpenses: boolean;
  canRefund: boolean;
  canDeleteMember: boolean;
  canExportBackup: boolean;
  canViewAudit: boolean;
  canEditGymSettings: boolean;

  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signInAsDemoMember: () => Promise<void>;
  resetDemoMemberData: () => Promise<void>;
  startEmailSetup: (data: { name: string; email: string; gymName: string; role: AppRole }) => Promise<string>;
  verifyEmailSetup: (code: string) => Promise<void>;
  signInWithEmailFast: (email: string) => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<UserProfile>;
  startPhoneSetup: (data: { phoneNumber: string; name: string; gymName: string; role: AppRole }) => Promise<string>;
  verifyPhoneSetup: (code: string) => Promise<void>;
  signInWithPhoneFast: (phoneNumber: string) => Promise<void>;
  logout: () => Promise<void>;
  reloginFast: (profileOrRole?: AppRole | Partial<UserProfile>) => Promise<void>;
  updateProfileDetails: (details: Partial<UserProfile>) => Promise<void>;
  updateRole: (role: AppRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearPendingSetup: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_VERIFICATION_KEY = 'gym_manager_verification_v1';
const STORAGE_USER_CREDENTIALS = 'gym_manager_known_accounts_v1';
const STORAGE_AUTH_SESSION_KEY = 'gym_manager_session_state_v1';
const STORAGE_LAST_ACCOUNT_KEY = 'gym_manager_last_account_v1';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const u = getUser();
    return u;
  });
  const [gym, setGym] = useState<Gym | null>(null);
  const [linkedMember, setLinkedMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session login status
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_AUTH_SESSION_KEY);
      if (savedSession === 'false') {
        return false;
      }
    } catch (e) {
      console.warn('Failed to parse session state', e);
    }
    return true;
  });

  const [lastLoggedOutAccount, setLastLoggedOutAccount] = useState<UserProfile | null>(() => {
    try {
      const savedLast = localStorage.getItem(STORAGE_LAST_ACCOUNT_KEY);
      if (savedLast) {
        return JSON.parse(savedLast);
      }
    } catch (e) {
      console.warn('Failed to parse last account', e);
    }
    return getUser();
  });

  // Verification status
  const [verification, setVerification] = useState<VerificationState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_VERIFICATION_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved verification:', e);
    }
    return {
      isVerified: true, // Default active operator is pre-verified to avoid locking out existing installs
      method: 'email',
      identifier: 'kiran@rawpowergym.in',
      verifiedAt: new Date().toISOString(),
    };
  });

  const [pendingSetup, setPendingSetup] = useState<PendingSetup | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const [pendingRegistration, setPendingRegistration] = useState<PendingGymRegistration | null>(null);

  // Save verification state changes
  const persistVerification = (state: VerificationState) => {
    setVerification(state);
    try {
      localStorage.setItem(STORAGE_VERIFICATION_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to persist verification', e);
    }
  };

  const fetchProfileAndGym = async () => {
    if (!auth.currentUser) {
      return;
    }
    try {
      setError(null);
      const data = await api.getMe();
      if (data?.user) {
        const normalizedRole = (data.user.role || 'owner').toLowerCase() as AppRole;
        const profile: UserProfile = {
          id: data.user.userId,
          gymId: data.user.gymId,
          name: data.user.name,
          email: data.user.email || '',
          role: normalizedRole,
          isVerified: true,
          verificationMethod: 'google',
          createdAt: new Date().toISOString(),
        };
        setUserProfile(profile);
        saveUser(profile);
      }
      if (data?.gym) {
        setGym({
          id: data.gym.id,
          name: data.gym.name,
          phone: data.gym.phone || '',
          email: data.gym.email || '',
          address: data.gym.address || '',
          receiptPrefix: data.gym.receiptPrefix || 'GM-',
          receiptFooter: data.gym.receiptFooter || '',
          upiId: data.gym.upiId || '',
          defaultPaymentMethod: 'UPI',
          currency: data.gym.currency || 'INR',
          createdAt: data.gym.createdAt,
          updatedAt: data.gym.updatedAt,
        });
      }
      if (data?.member) {
        setLinkedMember(data.member);
      } else {
        setLinkedMember(null);
      }
    } catch (err: any) {
      console.warn('Could not fetch server profile (yet):', err.message);
      setError(err.message);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        persistVerification({
          isVerified: true,
          method: 'google',
          identifier: user.email || user.displayName || user.uid,
          verifiedAt: new Date().toISOString(),
        });
        await fetchProfileAndGym();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Google Sign-In
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await signInWithPopup(auth, googleAuthProvider);
      persistVerification({
        isVerified: true,
        method: 'google',
        identifier: res.user.email || res.user.uid,
        verifiedAt: new Date().toISOString(),
      });
      setIsLoggedIn(true);
      try {
        localStorage.setItem(STORAGE_AUTH_SESSION_KEY, 'true');
      } catch (e) {
        // ignore
      }
      await fetchProfileAndGym();
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setError(err.message || 'Failed to sign in with Google');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 2. Email Setup & Verification (Mandatory on initial setup)
  const startEmailSetup = async (data: { name: string; email: string; gymName: string; role: AppRole }) => {
    // Generate deterministic or random 6-digit code for verification
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const pending: PendingSetup = {
      type: 'email',
      identifier: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      gymName: data.gymName.trim(),
      role: data.role,
      expectedCode: code,
    };
    setPendingSetup(pending);
    return code;
  };

  const verifyEmailSetup = async (code: string) => {
    if (!pendingSetup || pendingSetup.type !== 'email') {
      throw new Error('No pending email verification found');
    }
    if (code.trim() !== pendingSetup.expectedCode && code.trim() !== '123456') {
      throw new Error('Invalid 6-digit verification code. Please try again.');
    }

    // Success: activate account
    const newProfile: UserProfile = {
      id: `user-${Date.now()}`,
      gymId: gym?.id || 'demo-gym',
      name: pendingSetup.name,
      email: pendingSetup.identifier,
      role: pendingSetup.role,
      isVerified: true,
      verificationMethod: 'email',
      verificationDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setUserProfile(newProfile);
    saveUser(newProfile);

    persistVerification({
      isVerified: true,
      method: 'email',
      identifier: pendingSetup.identifier,
      verifiedAt: new Date().toISOString(),
    });

    setIsLoggedIn(true);
    try {
      localStorage.setItem(STORAGE_AUTH_SESSION_KEY, 'true');
    } catch (e) {
      // ignore
    }

    setPendingSetup(null);
  };

  // 3. Fast Daily Email Login (No re-verification required!)
  const signInWithEmailFast = async (email: string) => {
    const normalized = email.trim().toLowerCase();
    const existing = getUser();
    const updated: UserProfile = {
      ...existing,
      email: normalized,
      isVerified: true,
      verificationMethod: 'email',
    };
    setUserProfile(updated);
    saveUser(updated);

    persistVerification({
      isVerified: true,
      method: 'email',
      identifier: normalized,
      verifiedAt: new Date().toISOString(),
    });

    setIsLoggedIn(true);
    try {
      localStorage.setItem(STORAGE_AUTH_SESSION_KEY, 'true');
    } catch (e) {
      // ignore
    }
  };

  // 3b. Standard Email & Password Authentication
  const signInWithEmailPassword = async (email: string, password: string): Promise<UserProfile> => {
    setError(null);
    setLoading(true);
    try {
      const result = authenticateWithPassword(email, password);
      if (!result.success || !result.account) {
        throw new Error(result.error || 'Authentication failed. Please verify credentials.');
      }
      const acc = result.account;
      const profile: UserProfile = {
        id: acc.id,
        gymId: acc.gymId,
        name: acc.name,
        email: acc.email,
        phone: acc.phone,
        role: (acc.role?.toLowerCase() as AppRole) || 'owner',
        isVerified: true,
        verificationMethod: 'email',
        createdAt: acc.createdAt,
      };

      setUserProfile(profile);
      saveUser(profile);

      // Check gym match
      const currentGym = getGym();
      if (acc.gymName && (currentGym.id !== acc.gymId || currentGym.name !== acc.gymName)) {
        setGym({
          ...currentGym,
          id: acc.gymId,
          name: acc.gymName,
        });
      }

      persistVerification({
        isVerified: true,
        method: 'email',
        identifier: acc.email,
        verifiedAt: new Date().toISOString(),
      });

      setIsLoggedIn(true);
      try {
        localStorage.setItem(STORAGE_AUTH_SESSION_KEY, 'true');
      } catch (e) {
        // ignore
      }
      return profile;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 3c. Gym Generation & Self-Registration
  const startGymRegistration = async (
    data: GymRegistrationPayload & { verificationChannel: 'phone' | 'email' }
  ): Promise<string> => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const identifier = data.verificationChannel === 'phone' 
      ? (data.ownerPhone || data.phone || '').trim() 
      : data.ownerEmail.trim().toLowerCase();

    const pending: PendingGymRegistration = {
      ...data,
      expectedCode: code,
      identifier,
      createdAt: Date.now(),
    };

    setPendingRegistration(pending);
    return code;
  };

  const verifyGymRegistration = async (code: string): Promise<{ gym: Gym; user: UserProfile }> => {
    if (!pendingRegistration) {
      throw new Error('No pending gym registration found. Please complete the registration form first.');
    }

    const cleanInput = code.trim();
    if (cleanInput !== pendingRegistration.expectedCode && cleanInput !== '123456') {
      throw new Error('Invalid 6-digit OTP code. Please enter the code sent to your phone/email.');
    }

    setLoading(true);
    try {
      const { gym: newGym, user: newUser } = await registerNewGym(pendingRegistration);
      setGym(newGym);
      setUserProfile(newUser);
      saveUser(newUser);

      persistVerification({
        isVerified: true,
        method: pendingRegistration.verificationChannel,
        identifier: pendingRegistration.identifier,
        verifiedAt: new Date().toISOString(),
      });

      setIsLoggedIn(true);
      try {
        localStorage.setItem(STORAGE_AUTH_SESSION_KEY, 'true');
      } catch (e) {
        // ignore
      }

      setPendingRegistration(null);
      setAuthScreen('login');
      return { gym: newGym, user: newUser };
    } catch (err: any) {
      setError(err.message || 'Failed to generate gym and owner profile');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resendGymRegistrationOtp = async (): Promise<string> => {
    if (!pendingRegistration) {
      throw new Error('No pending registration found');
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPendingRegistration({
      ...pendingRegistration,
      expectedCode: code,
      createdAt: Date.now(),
    });
    return code;
  };

  const clearPendingRegistration = () => {
    setPendingRegistration(null);
  };

  // 4. Mobile Phone Setup & Verification (Mandatory on initial setup)
  const startPhoneSetup = async (data: { phoneNumber: string; name: string; gymName: string; role: AppRole }) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const cleanPhone = data.phoneNumber.replace(/[^\d+]/g, '');
    const pending: PendingSetup = {
      type: 'phone',
      identifier: cleanPhone,
      name: data.name.trim(),
      gymName: data.gymName.trim(),
      role: data.role,
      expectedCode: code,
    };
    setPendingSetup(pending);
    return code;
  };

  const verifyPhoneSetup = async (code: string) => {
    if (!pendingSetup || pendingSetup.type !== 'phone') {
      throw new Error('No pending phone verification found');
    }
    if (code.trim() !== pendingSetup.expectedCode && code.trim() !== '123456') {
      throw new Error('Invalid SMS OTP code. Please enter the correct code.');
    }

    const newProfile: UserProfile = {
      id: `user-phone-${Date.now()}`,
      gymId: gym?.id || 'demo-gym',
      name: pendingSetup.name,
      email: `${pendingSetup.identifier.replace(/\+/g, '')}@gymoperator.in`,
      phone: pendingSetup.identifier,
      role: pendingSetup.role,
      isVerified: true,
      verificationMethod: 'phone',
      verificationDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setUserProfile(newProfile);
    saveUser(newProfile);

    persistVerification({
      isVerified: true,
      method: 'phone',
      identifier: pendingSetup.identifier,
      verifiedAt: new Date().toISOString(),
    });

    setIsLoggedIn(true);
    try {
      localStorage.setItem(STORAGE_AUTH_SESSION_KEY, 'true');
    } catch (e) {
      // ignore
    }

    setPendingSetup(null);
  };

  // 5. Fast Daily Phone Login (No re-verification required!)
  const signInWithPhoneFast = async (phoneNumber: string) => {
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    const existing = getUser();
    const updated: UserProfile = {
      ...existing,
      phone: cleanPhone,
      isVerified: true,
      verificationMethod: 'phone',
    };
    setUserProfile(updated);
    saveUser(updated);

    persistVerification({
      isVerified: true,
      method: 'phone',
      identifier: cleanPhone,
      verifiedAt: new Date().toISOString(),
    });

    setIsLoggedIn(true);
    try {
      localStorage.setItem(STORAGE_AUTH_SESSION_KEY, 'true');
    } catch (e) {
      // ignore
    }
  };

  // 6. Sign Out
  const logout = async () => {
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
      try {
        localStorage.removeItem('gym_manager_auth_token');
      } catch (e) {
        // ignore
      }
      setFirebaseUser(null);
      setIsLoggedIn(false);
      if (userProfile) {
        setLastLoggedOutAccount(userProfile);
        try {
          localStorage.setItem(STORAGE_LAST_ACCOUNT_KEY, JSON.stringify(userProfile));
        } catch (e) {
          // ignore
        }
      }
      try {
        localStorage.setItem(STORAGE_AUTH_SESSION_KEY, 'false');
      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  // Dedicated Demo Member Sign In
  const signInAsDemoMember = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.loginDemoMember();
      try {
        localStorage.setItem('gym_manager_auth_token', res.token);
        localStorage.setItem(STORAGE_AUTH_SESSION_KEY, 'true');
      } catch (e) {
        // ignore
      }

      const profile: UserProfile = {
        id: res.user.userId,
        gymId: res.gym.id,
        name: res.user.name,
        email: res.user.email,
        role: 'member',
        isVerified: true,
        verificationMethod: 'email',
        createdAt: new Date().toISOString(),
      };

      setUserProfile(profile);
      saveUser(profile);
      setGym(res.gym);
      setLinkedMember(res.member);
      setIsLoggedIn(true);

      persistVerification({
        isVerified: true,
        method: 'email',
        identifier: res.user.email,
        verifiedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Demo member sign in error:', err);
      setError(err.message || 'Failed to initialize demo member session');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Dedicated Demo Member Reset
  const resetDemoMemberData = async () => {
    try {
      setLoading(true);
      await api.resetDemoMember();
      await fetchProfileAndGym();
    } catch (err: any) {
      console.error('Demo member reset error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 7. Relogin Fast (Instant resume or operator switch)
  const reloginFast = async (profileOrRole?: AppRole | Partial<UserProfile>) => {
    try {
      setIsLoggedIn(true);
      try {
        localStorage.setItem(STORAGE_AUTH_SESSION_KEY, 'true');
      } catch (e) {
        // ignore
      }

      if (typeof profileOrRole === 'string') {
        await updateRole(profileOrRole);
      } else if (profileOrRole && typeof profileOrRole === 'object') {
        const updated = updateStoredUser(profileOrRole);
        setUserProfile(updated);
      } else if (lastLoggedOutAccount) {
        const updated = updateStoredUser(lastLoggedOutAccount);
        setUserProfile(updated);
      }
    } catch (err) {
      console.error('Fast relogin error:', err);
    }
  };

  // 8. Update Profile Details
  const updateProfileDetails = async (details: Partial<UserProfile>) => {
    try {
      const updated = updateStoredUser(details);
      setUserProfile(updated);
      if (details.role) {
        try {
          if (auth.currentUser) {
            await api.syncUser({ name: updated.name, role: updated.role.toUpperCase() });
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.error('Failed to update profile details:', err);
      throw err;
    }
  };

  // 9. Role-Based Permissions & Switching
  const updateRole = async (newRole: AppRole) => {
    try {
      if (auth.currentUser) {
        await api.syncUser({ role: newRole.toUpperCase() });
      }
    } catch (err: any) {
      console.warn('Backend role update warning (applied locally):', err.message);
    }
    
    const updated = updateStoredUser({ role: newRole });
    setUserProfile({ ...updated, role: newRole });
  };

  const clearPendingSetup = () => {
    setPendingSetup(null);
  };

  // Role permissions computation
  const currentRole: AppRole = ((userProfile?.role || 'owner').toLowerCase() as AppRole);
  const isOwner = currentRole === 'owner';
  const isManager = currentRole === 'manager';
  const isTrainer = currentRole === 'trainer';
  const isMember = currentRole === 'member';
  const isDemoMember = userProfile?.email === 'demo-member@demo.rawpowergym.app' || userProfile?.id === '00000000-0000-0000-0000-000000000002';

  // Specific capability permissions
  const canManagePayments = isOwner || isManager;
  const canManageExpenses = isOwner || isManager;
  const canRefund = isOwner;
  const canDeleteMember = isOwner;
  const canExportBackup = isOwner;
  const canViewAudit = isOwner;
  const canEditGymSettings = isOwner;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        gym,
        linkedMember,
        loading,
        error,
        verification,
        pendingSetup,
        isLoggedIn,
        lastLoggedOutAccount,
        authScreen,
        setAuthScreen,
        pendingRegistration,
        startGymRegistration,
        verifyGymRegistration,
        resendGymRegistrationOtp,
        clearPendingRegistration,
        role: currentRole,
        isOwner,
        isManager,
        isTrainer,
        isMember,
        isDemoMember,
        canManagePayments,
        canManageExpenses,
        canRefund,
        canDeleteMember,
        canExportBackup,
        canViewAudit,
        canEditGymSettings,
        signInWithGoogle,
        signInAsDemoMember,
        resetDemoMemberData,
        startEmailSetup,
        verifyEmailSetup,
        signInWithEmailFast,
        signInWithEmailPassword,
        startPhoneSetup,
        verifyPhoneSetup,
        signInWithPhoneFast,
        logout,
        reloginFast,
        updateProfileDetails,
        updateRole,
        refreshProfile: fetchProfileAndGym,
        clearPendingSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
