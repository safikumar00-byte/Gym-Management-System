import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { api } from '../lib/api.ts';
import { Gym, UserProfile } from '../types';
import { 
  clearStorageCache,
  GymRegistrationPayload,
  registerNewGym
} from '../lib/storage.ts';

export type AppRole = 'owner' | 'manager' | 'trainer' | 'member';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  user: UserProfile | null;
  gym: Gym | null;
  linkedMember: any | null;
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  isEmailVerified: boolean;

  // View navigation between Sign In and Account Creation
  authScreen: 'login' | 'register';
  setAuthScreen: (screen: 'login' | 'register') => void;

  // Role & Permissions
  role: AppRole;
  setRole: (role: AppRole) => Promise<void>;
  updateRole: (role: AppRole) => Promise<void>;
  isOwner: boolean;
  isManager: boolean;
  isTrainer: boolean;
  isMember: boolean;
  canManagePayments: boolean;
  canManageExpenses: boolean;
  canRefund: boolean;
  canDeleteMember: boolean;
  canExportBackup: boolean;
  canViewAudit: boolean;
  canEditGymSettings: boolean;

  // Firebase Auth Actions
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string, name?: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  reloadUser: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfileDetails: (details: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  registerGymAccount: (data: GymRegistrationPayload) => Promise<{ gym: Gym; user: UserProfile }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);
  const [linkedMember, setLinkedMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');

  const fetchProfileAndGym = async () => {
    if (!auth.currentUser) {
      setUserProfile(null);
      setGym(null);
      setLinkedMember(null);
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
          name: data.user.name || auth.currentUser.displayName || 'Gym Operator',
          email: data.user.email || auth.currentUser.email || '',
          role: normalizedRole,
          createdAt: new Date().toISOString(),
        };
        setUserProfile(profile);
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
      console.warn('[Auth] Error fetching profile from backend:', err?.message || err);
      // Non-fatal if user is completing onboarding
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchProfileAndGym();
      } else {
        setUserProfile(null);
        setGym(null);
        setLinkedMember(null);
        clearStorageCache();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleAuthProvider);
      await fetchProfileAndGym();
    } catch (err: any) {
      console.error('[Auth] Google Sign-in error:', err);
      const msg = err?.code === 'auth/popup-closed-by-user' 
        ? 'Sign-in cancelled' 
        : (err?.message || 'Google sign-in failed');
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmailPassword = async (email: string, pass: string) => {
    try {
      setLoading(true);
      setError(null);
      const cleanEmail = email.trim().toLowerCase();
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
      await fetchProfileAndGym();
    } catch (err: any) {
      console.error('[Auth] Email Sign-in error:', err);
      let userMsg = 'Invalid email or password. Please verify your credentials.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        userMsg = 'Invalid email or password. Please check your credentials.';
      } else if (err.code === 'auth/too-many-requests') {
        userMsg = 'Access temporarily disabled due to multiple failed login attempts. Please reset your password or try again later.';
      } else if (err.code === 'auth/user-disabled') {
        userMsg = 'This account has been disabled. Please contact support.';
      }
      setError(userMsg);
      throw new Error(userMsg);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmailPassword = async (email: string, pass: string, name?: string) => {
    try {
      setLoading(true);
      setError(null);
      const cleanEmail = email.trim().toLowerCase();
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      
      if (name && name.trim() && userCredential.user) {
        await firebaseUpdateProfile(userCredential.user, { displayName: name.trim() }).catch(() => {});
      }

      // Send Firebase Email Verification immediately upon registration
      if (userCredential.user) {
        await sendEmailVerification(userCredential.user).catch((e) => {
          console.warn('[Auth] Email verification dispatch non-fatal error:', e);
        });
      }

      await fetchProfileAndGym();
    } catch (err: any) {
      console.error('[Auth] Sign-up error:', err);
      let userMsg = 'Failed to create account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        userMsg = 'This email address is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        userMsg = 'Please provide a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        userMsg = 'Password is too weak. Please use at least 6 characters with letters and numbers.';
      }
      setError(userMsg);
      throw new Error(userMsg);
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationEmailAction = async () => {
    if (!auth.currentUser) throw new Error('No user is currently signed in');
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        throw new Error('Verification email already sent recently. Please check your spam folder or wait a moment.');
      }
      throw new Error(err.message || 'Failed to send verification email');
    }
  };

  const sendPasswordReset = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Please enter your email address');
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // Safe UX: don't reveal account existence unnecessarily
        return;
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address');
      }
      throw new Error(err.message || 'Failed to dispatch password reset email');
    }
  };

  const reloadUserAction = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setFirebaseUser({ ...auth.currentUser });
      await fetchProfileAndGym();
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setUserProfile(null);
      setGym(null);
      setLinkedMember(null);
      clearStorageCache();
    } catch (err: any) {
      console.error('[Auth] Sign out error:', err);
    }
  };

  const updateProfileDetails = async (details: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated = { ...userProfile, ...details };
    setUserProfile(updated);
    try {
      await api.syncUser({ name: details.name, role: details.role?.toUpperCase() });
    } catch (err: any) {
      console.warn('[Auth] Sync user profile error:', err);
    }
  };

  const updateRole = async (newRole: AppRole) => {
    await updateProfileDetails({ role: newRole });
  };

  const refreshProfile = async () => {
    await fetchProfileAndGym();
  };

  const registerGymAccount = async (data: GymRegistrationPayload) => {
    const res = await registerNewGym(data);
    await fetchProfileAndGym();
    return res;
  };

  // Authoritative status derived strictly from Firebase user
  const isLoggedIn = !!firebaseUser;
  const isEmailVerified = useMemo(() => {
    if (!firebaseUser) return false;
    const isGoogle = firebaseUser.providerData.some(p => p.providerId === 'google.com');
    return isGoogle || firebaseUser.emailVerified;
  }, [firebaseUser]);

  const role: AppRole = useMemo(() => {
    return userProfile?.role || 'owner';
  }, [userProfile?.role]);

  const isOwner = role === 'owner';
  const isManager = role === 'manager';
  const isTrainer = role === 'trainer';
  const isMember = role === 'member';

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
        user: userProfile,
        gym,
        linkedMember,
        loading,
        error,
        isLoggedIn,
        isEmailVerified,
        authScreen,
        setAuthScreen,
        role,
        setRole: updateRole,
        updateRole,
        isOwner,
        isManager,
        isTrainer,
        isMember,
        canManagePayments,
        canManageExpenses,
        canRefund,
        canDeleteMember,
        canExportBackup,
        canViewAudit,
        canEditGymSettings,
        signInWithEmailPassword,
        signUpWithEmailPassword,
        sendVerificationEmail: sendVerificationEmailAction,
        sendPasswordReset,
        reloadUser: reloadUserAction,
        signInWithGoogle,
        logout,
        updateProfileDetails,
        refreshProfile,
        registerGymAccount,
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
