import { 
  Gym, 
  UserProfile, 
  MembershipPlan, 
  Member, 
  Membership, 
  Payment, 
  PaymentMethod,
  PaymentStatus,
  Expense, 
  NotificationItem, 
  DashboardMetrics, 
  PendingPaymentItem, 
  ExpiringMemberItem 
} from '../types';
import { 
  INITIAL_GYM, 
  INITIAL_USER, 
  INITIAL_PLANS, 
  INITIAL_MEMBERS, 
  INITIAL_MEMBERSHIPS, 
  INITIAL_PAYMENTS, 
  INITIAL_EXPENSES, 
  INITIAL_NOTIFICATIONS 
} from './seedData.ts';
import { 
  getTodayString, 
  calculatePendingAmount, 
  calculateNetIncome, 
  getDaysDifference, 
  addMonthsToDate 
} from './calculations.ts';
import { api } from './api.ts';
import { auth } from './firebase.ts';

// Clean up any legacy business records from localStorage as mandated by Cloud SaaS architecture
if (typeof window !== 'undefined') {
  try {
    const legacyKeys = [
      'gym_mgr_members', 
      'gym_mgr_memberships', 
      'gym_mgr_payments', 
      'gym_mgr_expenses', 
      'gym_mgr_plans',
      'gym_mgr_notifications'
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    // ignore
  }
}

// In-memory runtime cache synchronized with Cloud PostgreSQL
let cachedGym: Gym = { ...INITIAL_GYM };
let cachedUser: UserProfile = { ...INITIAL_USER };
let cachedPlans: MembershipPlan[] = [...INITIAL_PLANS];
let cachedMembers: Member[] = [...INITIAL_MEMBERS];
let cachedMemberships: Membership[] = [...INITIAL_MEMBERSHIPS];
let cachedPayments: Payment[] = INITIAL_PAYMENTS.map(p => ({
  ...p,
  date: p.date || p.paymentDate || getTodayString(),
  paymentDate: p.paymentDate || p.date || getTodayString(),
}));
let cachedExpenses: Expense[] = [...INITIAL_EXPENSES];
let cachedNotifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS];

type StorageListener = () => void;
const listeners = new Set<StorageListener>();

export function subscribeToStore(listener: StorageListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Store listener error', e);
    }
  });
}

// Cloud Synchronizer: Loads authoritative data from Cloud SQL / Express API
export async function syncWithCloud(): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    const [gymData, plansData, membersData, paymentsData, expensesData, notifsData] = await Promise.all([
      api.getGym().catch(() => null),
      api.getPlans().catch(() => null),
      api.getMembers().catch(() => null),
      api.getPayments().catch(() => null),
      api.getExpenses().catch(() => null),
      api.getNotifications().catch(() => null),
    ]);

    if (gymData && gymData.id) {
      cachedGym = {
        id: gymData.id,
        name: gymData.name,
        phone: gymData.phone || '',
        email: gymData.email || '',
        address: gymData.address || '',
        receiptPrefix: gymData.receiptPrefix || 'GM-',
        receiptFooter: gymData.receiptFooter || '',
        upiId: gymData.upiId || '',
        defaultPaymentMethod: 'UPI',
        currency: gymData.currency || 'INR',
        createdAt: gymData.createdAt,
        updatedAt: gymData.updatedAt,
      };
    }

    if (plansData && Array.isArray(plansData) && plansData.length > 0) {
      cachedPlans = plansData.map((p: any) => ({
        id: p.id,
        gymId: p.gymId,
        name: p.name,
        durationMonths: p.durationMonths,
        durationDays: p.durationDays,
        price: parseFloat(p.price),
        description: p.description || '',
        status: p.active ? 'active' : 'inactive',
        isActive: p.active,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
    }

    if (membersData && Array.isArray(membersData) && membersData.length > 0) {
      cachedMembers = membersData.map((m: any) => ({
        id: m.id,
        gymId: m.gymId,
        memberId: m.memberId,
        name: m.name,
        phone: m.phone || '',
        email: m.email || '',
        dateOfBirth: m.dateOfBirth || '',
        gender: m.gender || 'Prefer not to say',
        address: m.address || '',
        emergencyContact: m.emergencyContact || '',
        joinedDate: m.joinedDate,
        status: m.status,
        notes: m.notes || '',
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }));

      // Extract active memberships if provided
      const msList: Membership[] = [];
      membersData.forEach((m: any) => {
        if (m.activeMembership) {
          msList.push({
            id: m.activeMembership.id,
            gymId: m.gymId,
            memberId: m.id,
            planId: m.activeMembership.planId,
            planName: m.activeMembership.planName,
            startDate: m.activeMembership.startDate,
            expiryDate: m.activeMembership.endDate,
            totalFee: m.activeMembership.totalFee,
            discount: m.activeMembership.discount,
            finalAmount: m.activeMembership.finalAmount,
            status: m.activeMembership.status,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          });
        }
      });
      if (msList.length > 0) {
        cachedMemberships = msList;
      }
    }

    if (paymentsData && Array.isArray(paymentsData) && paymentsData.length > 0) {
      cachedPayments = paymentsData.map((p: any) => {
        const payDateStr = p.date ? p.date.split('T')[0] : (p.paymentDate ? p.paymentDate.split('T')[0] : getTodayString());
        return {
          id: p.id,
          gymId: p.gymId,
          memberId: p.memberId,
          memberName: p.memberName,
          membershipId: p.membershipId,
          receiptNumber: p.receiptNumber,
          amount: parseFloat(p.amount),
          paymentMethod: p.paymentMethod,
          paymentDate: payDateStr,
          date: payDateStr,
          status: p.status || 'Paid',
          notes: p.notes || '',
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      });
    }

    if (expensesData && Array.isArray(expensesData) && expensesData.length > 0) {
      cachedExpenses = expensesData.map((e: any) => ({
        id: e.id,
        gymId: e.gymId,
        category: e.category,
        description: e.description,
        amount: parseFloat(e.amount),
        date: e.date,
        paymentMethod: e.paymentMethod,
        notes: e.notes || '',
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }));
    }

    if (notifsData && Array.isArray(notifsData) && notifsData.length > 0) {
      cachedNotifications = notifsData.map((n: any) => {
        const isReadVal = n.isRead !== undefined ? n.isRead : !!n.read;
        return {
          id: n.id,
          gymId: n.gymId,
          type: n.type,
          title: n.title,
          message: n.message,
          memberId: n.memberId,
          memberName: n.memberName,
          amount: n.amount ? parseFloat(n.amount) : undefined,
          date: n.date,
          read: isReadVal,
          isRead: isReadVal,
          phone: n.phone,
          createdAt: n.createdAt,
        };
      });
    }

    notifyListeners();
  } catch (err) {
    console.warn('Initial cloud sync error:', err);
  }
}

// Auto-trigger sync on client startup
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncWithCloud();
  }, 100);
}

// ---------------------- GYM & USER ----------------------

export function getGym(): Gym {
  return cachedGym;
}

export function saveGym(gym: Gym): void {
  cachedGym = gym;
  notifyListeners();
  if (auth.currentUser) {
    api.updateGym(gym).catch(e => console.error('Failed to sync gym update:', e));
  }
}

export function updateGym(updates: Partial<Gym>): Gym {
  cachedGym = { ...cachedGym, ...updates, updatedAt: getTodayString() };
  notifyListeners();
  if (auth.currentUser) {
    api.updateGym(updates).catch(e => console.error('Failed to sync gym update:', e));
  }
  return cachedGym;
}

export function getUser(): UserProfile {
  return cachedUser;
}

export function saveUser(user: UserProfile): void {
  cachedUser = user;
  notifyListeners();
  if (auth.currentUser) {
    api.syncUser({ name: user.name, role: user.role.toUpperCase() }).catch(e => console.error('Failed to sync user:', e));
  }
}

export function updateUser(updates: Partial<UserProfile>): UserProfile {
  cachedUser = { ...cachedUser, ...updates };
  notifyListeners();
  if (auth.currentUser) {
    api.syncUser({ name: cachedUser.name, role: cachedUser.role.toUpperCase() }).catch(e => console.error('Failed to sync user:', e));
  }
  return cachedUser;
}

// ---------------------- REGISTERED ACCOUNTS & GYM GENERATION ----------------------

export interface RegisteredAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: 'owner' | 'manager' | 'trainer';
  gymId: string;
  gymName: string;
  createdAt: string;
}

export interface GymRegistrationPayload {
  gymName: string;
  phone?: string;
  email?: string;
  address?: string;
  upiId?: string;
  currency?: string;
  receiptPrefix?: string;
  receiptFooter?: string;
  facilities?: string[];
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  password?: string;
}

const DEFAULT_REGISTERED_ACCOUNTS: RegisteredAccount[] = [
  {
    id: 'user-01',
    name: 'Rajesh Sharma',
    email: 'rajesh@ironcoregym.com',
    phone: '+91 98765 43210',
    password: 'admin123',
    role: 'owner',
    gymId: 'gym-01',
    gymName: 'Iron Core Fitness',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-02',
    name: 'Amit Patel',
    email: 'amit@ironcoregym.com',
    phone: '+91 98765 43211',
    password: 'manager123',
    role: 'manager',
    gymId: 'gym-01',
    gymName: 'Iron Core Fitness',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-03',
    name: 'Vikram Singh',
    email: 'vikram@ironcoregym.com',
    phone: '+91 98765 43212',
    password: 'trainer123',
    role: 'trainer',
    gymId: 'gym-01',
    gymName: 'Iron Core Fitness',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-04',
    name: 'Kiran Reddy',
    email: 'kiran@rawpowergym.in',
    phone: '+91 98450 11223',
    password: 'admin123',
    role: 'owner',
    gymId: 'gym-rawpower',
    gymName: 'Raw Power Gym',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const STORAGE_REGISTERED_ACCOUNTS_KEY = 'gym_manager_registered_accounts_v2';

export function getRegisteredAccounts(): RegisteredAccount[] {
  if (typeof window === 'undefined') return DEFAULT_REGISTERED_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_REGISTERED_ACCOUNTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_REGISTERED_ACCOUNTS_KEY, JSON.stringify(DEFAULT_REGISTERED_ACCOUNTS));
      return DEFAULT_REGISTERED_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_REGISTERED_ACCOUNTS;
  } catch (e) {
    return DEFAULT_REGISTERED_ACCOUNTS;
  }
}

export function saveRegisteredAccount(account: RegisteredAccount): void {
  const accounts = getRegisteredAccounts();
  const existingIdx = accounts.findIndex(a => a.email.toLowerCase() === account.email.toLowerCase());
  if (existingIdx >= 0) {
    accounts[existingIdx] = { ...accounts[existingIdx], ...account };
  } else {
    accounts.push(account);
  }
  try {
    localStorage.setItem(STORAGE_REGISTERED_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save account', e);
  }
}

export function authenticateWithPassword(
  email: string, 
  password: string
): { success: boolean; account?: RegisteredAccount; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  const accounts = getRegisteredAccounts();
  const matched = accounts.find(a => a.email.toLowerCase() === cleanEmail);

  if (!matched) {
    // If not found in registered accounts list, check if user is entering admin123 for cachedUser
    if (cachedUser?.email && cleanEmail === cachedUser.email.toLowerCase() && cleanPass === 'admin123') {
      const defaultAccount: RegisteredAccount = {
        id: cachedUser.id,
        name: cachedUser.name,
        email: cachedUser.email,
        phone: cachedUser.phone,
        password: cleanPass,
        role: (cachedUser.role?.toLowerCase() as any) || 'owner',
        gymId: cachedGym.id,
        gymName: cachedGym.name,
        createdAt: new Date().toISOString(),
      };
      saveRegisteredAccount(defaultAccount);
      return { success: true, account: defaultAccount };
    }
    return { 
      success: false, 
      error: `No registered account found for '${cleanEmail}'. Please verify the email address or register a new gym account.` 
    };
  }

  // Verify password
  if (matched.password && matched.password !== cleanPass) {
    return {
      success: false,
      error: 'Incorrect password. Please verify your password or use the OTP code option.',
    };
  }

  return { success: true, account: matched };
}

export async function registerNewGym(payload: GymRegistrationPayload): Promise<{ gym: Gym; user: UserProfile }> {
  const gymId = 'gym-' + Date.now();
  const userId = 'user-' + Date.now();
  const createdDate = new Date().toISOString();

  const newGym: Gym = {
    id: gymId,
    name: payload.gymName.trim(),
    phone: payload.phone?.trim() || payload.ownerPhone?.trim() || '',
    email: payload.email?.trim() || payload.ownerEmail.trim(),
    address: payload.address?.trim() || '',
    receiptPrefix: (payload.receiptPrefix?.trim() || 'GM-').toUpperCase(),
    receiptFooter: payload.receiptFooter?.trim() || 'Thank you for training with us! Fees once paid are non-refundable.',
    upiId: payload.upiId?.trim() || '',
    defaultPaymentMethod: 'UPI',
    currency: (payload.currency?.trim() || 'INR').toUpperCase(),
    createdAt: createdDate,
    updatedAt: createdDate,
  };

  const newUser: UserProfile = {
    id: userId,
    gymId: gymId,
    name: payload.ownerName.trim(),
    email: payload.ownerEmail.trim().toLowerCase(),
    phone: payload.ownerPhone?.trim() || payload.phone?.trim() || '',
    role: 'owner',
    isVerified: true,
    verificationMethod: payload.ownerPhone ? 'phone' : 'email',
    verificationDate: createdDate,
    createdAt: createdDate,
  };

  // Create starter membership plans tailored to this gym
  const starterPlans: MembershipPlan[] = [
    {
      id: 'plan-' + Date.now() + '-1',
      gymId: gymId,
      name: 'Monthly Core Access',
      durationMonths: 1,
      durationDays: 30,
      price: 1500,
      description: 'Standard 1-month fitness & gym floor access',
      isActive: true,
      status: 'active',
      createdAt: createdDate,
      updatedAt: createdDate,
    },
    {
      id: 'plan-' + Date.now() + '-2',
      gymId: gymId,
      name: 'Quarterly Power Plan',
      durationMonths: 3,
      durationDays: 90,
      price: 3800,
      description: '3-month quarterly membership with locker & cardio access',
      isActive: true,
      status: 'active',
      createdAt: createdDate,
      updatedAt: createdDate,
    },
    {
      id: 'plan-' + Date.now() + '-3',
      gymId: gymId,
      name: 'Annual Elite Membership',
      durationMonths: 12,
      durationDays: 365,
      price: 12000,
      description: 'Full 1-year unlimited access with diet consultation',
      isActive: true,
      status: 'active',
      createdAt: createdDate,
      updatedAt: createdDate,
    },
  ];

  // Set as authoritative cached gym and user
  cachedGym = newGym;
  cachedUser = newUser;
  cachedPlans = starterPlans;
  cachedMembers = [];
  cachedMemberships = [];
  cachedPayments = [];
  cachedExpenses = [];
  cachedNotifications = [
    {
      id: 'notif-' + Date.now(),
      gymId: gymId,
      type: 'general',
      title: `Welcome to ${newGym.name}!`,
      message: 'Your new gym workspace has been created. Customize plans or register your first members anytime.',
      date: getTodayString(),
      read: false,
      isRead: false,
    },
  ];

  // Save registered account credentials for Email+Password logins
  const newAccount: RegisteredAccount = {
    id: userId,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    password: payload.password || 'admin123',
    role: 'owner',
    gymId: gymId,
    gymName: newGym.name,
    createdAt: createdDate,
  };
  saveRegisteredAccount(newAccount);

  // Attempt backend PostgreSQL sync
  try {
    const apiResult = await api.registerGym({
      gymName: newGym.name,
      phone: newGym.phone,
      email: newGym.email,
      address: newGym.address,
      upiId: newGym.upiId,
      currency: newGym.currency,
      receiptPrefix: newGym.receiptPrefix,
      receiptFooter: newGym.receiptFooter,
      ownerName: newUser.name,
      ownerEmail: newUser.email,
      ownerPhone: newUser.phone,
    });
    if (apiResult?.gym?.id) {
      cachedGym.id = apiResult.gym.id;
    }
    if (apiResult?.user?.id) {
      cachedUser.id = apiResult.user.id;
    }
  } catch (err) {
    console.warn('Backend gym registration handled in local memory:', err);
  }

  notifyListeners();
  return { gym: cachedGym, user: cachedUser };
}

// ---------------------- PLANS ----------------------

export function getPlans(): MembershipPlan[] {
  return cachedPlans.map(p => ({
    ...p,
    isActive: p.isActive !== undefined ? p.isActive : p.status !== 'inactive',
  }));
}

export function getPlan(id: string): MembershipPlan | undefined {
  return getPlans().find(p => p.id === id);
}

export function addPlan(planData: Omit<MembershipPlan, 'id' | 'gymId' | 'createdAt' | 'updatedAt'>): MembershipPlan {
  const newPlan: MembershipPlan = {
    ...planData,
    id: 'plan-' + Date.now(),
    gymId: cachedGym.id,
    isActive: planData.isActive !== undefined ? planData.isActive : true,
    status: planData.isActive === false ? 'inactive' : 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  cachedPlans = [...cachedPlans, newPlan];
  notifyListeners();

  // Async cloud sync
  if (auth.currentUser) {
    api.createPlan({
      name: planData.name,
      durationMonths: planData.durationMonths,
      durationDays: planData.durationDays,
      price: planData.price,
      description: planData.description,
      active: newPlan.isActive,
    }).then((saved) => {
      if (saved && saved.id) {
        newPlan.id = saved.id;
        notifyListeners();
      }
    }).catch(err => console.error('Failed to create plan in cloud:', err));
  }

  return newPlan;
}

export function updatePlan(plan: MembershipPlan): void {
  savePlan({
    ...plan,
    status: plan.isActive === false ? 'inactive' : 'active',
  });
}

export function savePlan(plan: MembershipPlan): void {
  cachedPlans = cachedPlans.map(p => p.id === plan.id ? { ...plan, updatedAt: getTodayString() } : p);
  notifyListeners();

  if (auth.currentUser) {
    api.updatePlan(plan.id, {
      name: plan.name,
      durationMonths: plan.durationMonths,
      durationDays: plan.durationDays,
      price: plan.price,
      description: plan.description,
      active: plan.isActive !== false,
    }).catch(err => console.error('Failed to update plan in cloud:', err));
  }
}

export function deletePlan(id: string): { success: boolean; message?: string } {
  const referenced = cachedMemberships.some(m => m.planId === id);
  if (referenced) {
    return {
      success: false,
      message: 'Cannot delete this plan as it is referenced by existing member records. Deactivate it instead.',
    };
  }
  cachedPlans = cachedPlans.filter(p => p.id !== id);
  notifyListeners();

  if (auth.currentUser) {
    api.deletePlan(id).catch(err => console.error('Failed to delete plan in cloud:', err));
  }
  return { success: true };
}

// ---------------------- MEMBERS ----------------------

export function getMembers(): Member[] {
  return cachedMembers;
}

export function getMember(id: string): Member | undefined {
  return cachedMembers.find(m => m.id === id || m.memberId === id);
}

export function getNextMemberId(): string {
  let maxNum = 0;
  for (const m of cachedMembers) {
    const match = m.memberId.match(/GM-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `${cachedGym.receiptPrefix || 'GM-'}${String(nextNum).padStart(3, '0')}`;
}

export function addMemberWithDetails(
  memberData: Omit<Member, 'id' | 'gymId' | 'createdAt' | 'updatedAt'>,
  membershipPlanId: string,
  startDate: string,
  discount: number,
  initialPaymentAmount?: number,
  initialPaymentMethod?: any
): { member: Member; membership: Membership; payment?: Payment } {
  const plan = cachedPlans.find(p => p.id === membershipPlanId) || cachedPlans[0];
  const finalAmount = Math.max(0, plan.price - (discount || 0));
  const expiryDate = addMonthsToDate(startDate, plan.durationMonths);
  const isFullyPaid = (initialPaymentAmount || 0) >= finalAmount;

  const tempMemberId = 'm-' + Date.now();
  const newMember: Member = {
    ...memberData,
    id: tempMemberId,
    gymId: cachedGym.id,
    status: isFullyPaid ? 'ACTIVE' : 'PAYMENT PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const tempMembershipId = 'ms-' + Date.now();
  const newMembership: Membership = {
    id: tempMembershipId,
    gymId: cachedGym.id,
    memberId: newMember.id,
    planId: plan.id,
    planName: plan.name,
    startDate,
    expiryDate,
    totalFee: plan.price,
    discount: discount || 0,
    finalAmount,
    status: isFullyPaid ? 'Active' : 'Pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let newPayment: Payment | undefined;
  if (initialPaymentAmount && initialPaymentAmount > 0) {
    const today = getTodayString();
    newPayment = {
      id: 'pay-' + Date.now(),
      gymId: cachedGym.id,
      memberId: newMember.id,
      memberName: newMember.name,
      membershipId: newMembership.id,
      amount: initialPaymentAmount,
      paymentDate: today,
      date: today,
      paymentMethod: initialPaymentMethod || 'Cash',
      receiptNumber: getNextReceiptNumber(),
      status: 'Paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    cachedPayments = [newPayment, ...cachedPayments];
  }

  cachedMembers = [newMember, ...cachedMembers];
  cachedMemberships = [newMembership, ...cachedMemberships];
  notifyListeners();

  // Cloud API call with server-side transactional creation
  if (auth.currentUser) {
    api.createMember({
      name: memberData.name,
      phone: memberData.phone,
      email: memberData.email,
      dateOfBirth: memberData.dateOfBirth,
      gender: memberData.gender,
      address: memberData.address,
      joinedDate: memberData.joinedDate || startDate,
      emergencyContact: memberData.emergencyContact,
      notes: memberData.notes,
      planId: plan.id,
      startDate,
      discount: discount || 0,
      initialPayment: initialPaymentAmount || 0,
      paymentMethod: initialPaymentMethod || 'Cash',
    }).then((res) => {
      if (res?.member) {
        newMember.id = res.member.id;
        newMember.memberId = res.member.memberCode || newMember.memberId;
      }
      if (res?.membership) {
        newMembership.id = res.membership.id;
      }
      if (res?.payment && newPayment) {
        newPayment.id = res.payment.id;
        newPayment.receiptNumber = res.payment.receiptNumber;
      }
      notifyListeners();
    }).catch((err) => {
      console.error('Failed to create member in cloud:', err);
    });
  }

  return { member: newMember, membership: newMembership, payment: newPayment };
}

export function updateMember(idOrMember: string | Member, updates?: Partial<Member>): Member | undefined {
  let id: string;
  let partialUpdates: Partial<Member>;

  if (typeof idOrMember === 'string') {
    id = idOrMember;
    partialUpdates = updates || {};
  } else {
    id = idOrMember.id;
    partialUpdates = idOrMember;
  }

  let updatedMember: Member | undefined;
  cachedMembers = cachedMembers.map((m) => {
    if (m.id === id) {
      updatedMember = { ...m, ...partialUpdates, updatedAt: getTodayString() };
      return updatedMember;
    }
    return m;
  });
  notifyListeners();

  if (updatedMember && auth.currentUser) {
    api.updateMember(id, partialUpdates).catch(err => console.error('Failed to update member in cloud:', err));
  }
  return updatedMember;
}

export function saveMember(member: Member): void {
  const index = cachedMembers.findIndex(m => m.id === member.id);
  if (index >= 0) {
    cachedMembers[index] = { ...member, updatedAt: getTodayString() };
  } else {
    cachedMembers.unshift(member);
  }
  notifyListeners();

  if (auth.currentUser) {
    api.updateMember(member.id, member).catch(err => console.error('Failed to save member in cloud:', err));
  }
}

export function deleteMember(id: string): { success: boolean } {
  cachedMembers = cachedMembers.filter(m => m.id !== id);
  cachedMemberships = cachedMemberships.filter(m => m.memberId !== id);
  cachedPayments = cachedPayments.filter(p => p.memberId !== id);
  notifyListeners();

  if (auth.currentUser) {
    api.deleteMember(id).catch(err => console.error('Failed to delete member in cloud:', err));
  }
  return { success: true };
}

export function renewMember(
  memberId: string,
  planId: string,
  startDate: string,
  discount: number = 0,
  initialPaymentAmount?: number,
  initialPaymentMethod?: any
): { membership: Membership; payment?: Payment } {
  const member = getMember(memberId);
  const plan = cachedPlans.find(p => p.id === planId) || cachedPlans[0];
  const finalAmount = Math.max(0, plan.price - discount);
  const expiryDate = addMonthsToDate(startDate, plan.durationMonths);
  const isFullyPaid = (initialPaymentAmount || 0) >= finalAmount;

  const newMembership: Membership = {
    id: 'ms-' + Date.now(),
    gymId: cachedGym.id,
    memberId,
    planId: plan.id,
    planName: plan.name,
    startDate,
    expiryDate,
    totalFee: plan.price,
    discount,
    finalAmount,
    status: isFullyPaid ? 'Active' : 'Pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let newPayment: Payment | undefined;
  if (initialPaymentAmount && initialPaymentAmount > 0) {
    const today = getTodayString();
    newPayment = {
      id: 'pay-' + Date.now(),
      gymId: cachedGym.id,
      memberId,
      memberName: member?.name || 'Member',
      membershipId: newMembership.id,
      amount: initialPaymentAmount,
      paymentDate: today,
      date: today,
      paymentMethod: initialPaymentMethod || 'Cash',
      receiptNumber: getNextReceiptNumber(),
      status: 'Paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    cachedPayments = [newPayment, ...cachedPayments];
  }

  cachedMemberships = [newMembership, ...cachedMemberships];
  if (member) {
    updateMember(memberId, { status: isFullyPaid ? 'ACTIVE' : 'PAYMENT PENDING' });
  }
  notifyListeners();

  // Call cloud renewal API with idempotency
  if (auth.currentUser) {
    const idempotencyKey = `renew-${memberId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    api.renewMembership({
      memberId,
      planId,
      startDate,
      discount,
      initialPayment: initialPaymentAmount || 0,
      paymentMethod: initialPaymentMethod || 'Cash',
      idempotencyKey,
    }).then((res) => {
      if (res?.membership) {
        newMembership.id = res.membership.id;
      }
      if (res?.payment && newPayment) {
        newPayment.id = res.payment.id;
        newPayment.receiptNumber = res.payment.receiptNumber;
      }
      notifyListeners();
    }).catch(err => console.error('Failed to renew membership in cloud:', err));
  }

  return { membership: newMembership, payment: newPayment };
}

// ---------------------- MEMBERSHIPS ----------------------

export function getMemberships(): Membership[] {
  return cachedMemberships;
}

export function getMembership(id: string): Membership | undefined {
  return cachedMemberships.find(m => m.id === id);
}

export function getMemberActiveMembership(memberId: string): Membership | undefined {
  return cachedMemberships
    .filter(m => m.memberId === memberId)
    .sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime())[0];
}

export function getMemberMembershipHistory(memberId: string): Membership[] {
  return cachedMemberships
    .filter(m => m.memberId === memberId)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

export const renewMembership = renewMember;

export function saveMembership(membership: Membership): void {
  const index = cachedMemberships.findIndex(m => m.id === membership.id);
  if (index >= 0) {
    cachedMemberships[index] = { ...membership, updatedAt: getTodayString() };
  } else {
    cachedMemberships.unshift(membership);
  }
  notifyListeners();
}

// ---------------------- PAYMENTS ----------------------

export function getPayments(): Payment[] {
  return cachedPayments;
}

export function getPayment(id: string): Payment | undefined {
  return cachedPayments.find(p => p.id === id || p.receiptNumber === id);
}

export function getNextReceiptNumber(): string {
  let maxNum = 0;
  for (const p of cachedPayments) {
    const match = p.receiptNumber.match(/GM-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `${cachedGym.receiptPrefix || 'GM-'}${String(nextNum).padStart(6, '0')}`;
}

export function addPayment(paymentData: {
  memberId: string;
  membershipId?: string;
  memberName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  date?: string;
  status?: PaymentStatus;
  notes?: string;
}): Payment {
  const tempId = 'pay-' + Date.now();
  const receiptNumber = getNextReceiptNumber();
  const today = getTodayString();
  const member = cachedMembers.find(m => m.id === paymentData.memberId || m.memberId === paymentData.memberId);
  const memberName = paymentData.memberName || member?.name || 'Member';

  const newPayment: Payment = {
    id: tempId,
    gymId: cachedGym.id,
    memberId: member ? member.id : paymentData.memberId,
    memberName,
    membershipId: paymentData.membershipId || '',
    amount: paymentData.amount,
    receiptNumber,
    paymentDate: paymentData.paymentDate || (paymentData as any).date || today,
    date: paymentData.paymentDate || (paymentData as any).date || today,
    paymentMethod: paymentData.paymentMethod,
    status: paymentData.status || 'Paid',
    notes: paymentData.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  cachedPayments = [newPayment, ...cachedPayments];

  // Update membership & member status
  if (paymentData.membershipId) {
    const ms = cachedMemberships.find(m => m.id === paymentData.membershipId);
    if (ms) {
      const allPaid = cachedPayments
        .filter(p => p.membershipId === ms.id && p.status !== 'Refunded')
        .reduce((sum, p) => sum + p.amount, 0);

      if (allPaid >= ms.finalAmount) {
        ms.status = 'Active';
        saveMembership(ms);
        updateMember(paymentData.memberId, { status: 'ACTIVE' });
      }
    }
  }

  notifyListeners();

  // Authoritative server-validated transaction with idempotency
  if (auth.currentUser) {
    const idempotencyKey = `pay-${paymentData.memberId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    api.createPayment({
      memberId: paymentData.memberId,
      membershipId: paymentData.membershipId,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      notes: paymentData.notes,
      idempotencyKey,
    }).then((created) => {
      if (created && created.id) {
        newPayment.id = created.id;
        newPayment.receiptNumber = created.receiptNumber;
        notifyListeners();
      }
    }).catch((err) => {
      console.error('Payment creation failed on server:', err);
    });
  }

  return newPayment;
}

export function refundPayment(paymentId: string, reason?: string): boolean {
  const payment = cachedPayments.find(p => p.id === paymentId);
  if (!payment) return false;

  payment.status = 'Refunded';
  if (reason) payment.notes = payment.notes ? `${payment.notes} | ${reason}` : reason;
  payment.updatedAt = getTodayString();
  notifyListeners();

  if (auth.currentUser) {
    api.refundPayment(paymentId).catch(err => console.error('Refund failed in cloud:', err));
  }
  return true;
}

export function deletePayment(paymentId: string): boolean {
  cachedPayments = cachedPayments.filter(p => p.id !== paymentId);
  notifyListeners();
  return true;
}

// ---------------------- EXPENSES ----------------------

export function getExpenses(): Expense[] {
  return cachedExpenses;
}

export function addExpense(expenseData: Omit<Expense, 'id' | 'gymId' | 'createdAt' | 'updatedAt'>): Expense {
  const newExpense: Expense = {
    ...expenseData,
    id: 'exp-' + Date.now(),
    gymId: cachedGym.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  cachedExpenses = [newExpense, ...cachedExpenses];
  notifyListeners();

  if (auth.currentUser) {
    api.createExpense(expenseData).then((saved) => {
      if (saved && saved.id) {
        newExpense.id = saved.id;
        notifyListeners();
      }
    }).catch(err => console.error('Failed to create expense in cloud:', err));
  }

  return newExpense;
}

export function updateExpense(expense: Expense): void {
  cachedExpenses = cachedExpenses.map(e => e.id === expense.id ? { ...expense, updatedAt: getTodayString() } : e);
  notifyListeners();

  if (auth.currentUser) {
    api.updateExpense(expense.id, expense).catch(err => console.error('Failed to update expense in cloud:', err));
  }
}

export function deleteExpense(id: string): boolean {
  cachedExpenses = cachedExpenses.filter(e => e.id !== id);
  notifyListeners();

  if (auth.currentUser) {
    api.deleteExpense(id).catch(err => console.error('Failed to delete expense in cloud:', err));
  }
  return true;
}

// ---------------------- NOTIFICATIONS ----------------------

export function getNotifications(): NotificationItem[] {
  return cachedNotifications;
}

export function markNotificationAsRead(id: string): void {
  cachedNotifications = cachedNotifications.map(n => n.id === id ? { ...n, isRead: true } : n);
  notifyListeners();

  if (auth.currentUser) {
    api.markNotificationRead(id).catch(err => console.error('Error marking read:', err));
  }
}

export function markAllNotificationsAsRead(): void {
  cachedNotifications = cachedNotifications.map(n => ({ ...n, isRead: true }));
  notifyListeners();

  if (auth.currentUser) {
    api.markAllNotificationsRead().catch(err => console.error('Error marking all read:', err));
  }
}

export function clearAllNotifications(): void {
  cachedNotifications = cachedNotifications.filter(n => !n.isRead);
  notifyListeners();

  if (auth.currentUser) {
    api.clearNotifications().catch(err => console.error('Error clearing notifications:', err));
  }
}

// ---------------------- DASHBOARD METRICS ----------------------

export function getDashboardMetrics(): DashboardMetrics {
  const members = getMembers();
  const payments = getPayments();
  const expenses = getExpenses();
  const memberships = getMemberships();
  const today = getTodayString();
  const currentMonthPrefix = today.substring(0, 7);

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'ACTIVE').length;
  const expiringSoon = members.filter(m => m.status === 'EXPIRING SOON').length;

  const todayRevenue = payments
    .filter(p => {
      const pDate = p.paymentDate || p.date || '';
      return pDate === today && p.status === 'Paid';
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const monthRevenue = payments
    .filter(p => {
      const pDate = p.paymentDate || p.date || '';
      return pDate.startsWith(currentMonthPrefix) && p.status === 'Paid';
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const monthExpenses = expenses
    .filter(e => (e.date || '').startsWith(currentMonthPrefix))
    .reduce((sum, e) => sum + e.amount, 0);

  const pendingPayments = getPendingPayments();
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + (p.pendingAmount || p.amount || 0), 0);

  return {
    totalMembers,
    activeMembers,
    expiringSoon,
    expired: 0,
    paidThisMonth: monthRevenue,
    pendingPayments: pendingPayments.length,
    todayCollection: todayRevenue,
    todayRevenue,
    thisMonthRevenue: monthRevenue,
    monthRevenue,
    pendingPaymentsCount: pendingPayments.length,
    pendingAmount,
    thisMonthExpenses: monthExpenses,
    monthExpenses,
    netIncome: monthRevenue - monthExpenses,
  };
}

export function getPendingPayments(): PendingPaymentItem[] {
  const members = getMembers();
  const payments = getPayments();
  const memberships = getMemberships();
  const items: PendingPaymentItem[] = [];

  for (const m of members) {
    const activeMs = getMemberActiveMembership(m.id);
    if (!activeMs) continue;

    const paidForThisMs = payments
      .filter(p => p.membershipId === activeMs.id && p.status !== 'Refunded')
      .reduce((sum, p) => sum + p.amount, 0);

    const pending = Math.max(0, activeMs.finalAmount - paidForThisMs);
    if (pending > 0) {
      items.push({
        id: m.id,
        memberId: m.memberId,
        memberName: m.name,
        name: m.name,
        phone: m.phone,
        planName: activeMs.planName,
        amount: pending,
        pendingAmount: pending,
        dueDate: activeMs.startDate,
        status: m.status,
      });
    }
  }

  return items;
}

export const getPendingPaymentsList = getPendingPayments;

export function getExpiringMembers(): ExpiringMemberItem[] {
  const members = getMembers();
  const items: ExpiringMemberItem[] = [];

  for (const m of members) {
    const activeMs = getMemberActiveMembership(m.id);
    if (!activeMs) continue;

    const daysLeft = getDaysDifference(getTodayString(), activeMs.expiryDate);
    if (daysLeft >= 0 && daysLeft <= 7) {
      items.push({
        id: m.id,
        memberId: m.memberId,
        memberName: m.name,
        name: m.name,
        phone: m.phone,
        planName: activeMs.planName,
        expiryDate: activeMs.expiryDate,
        daysLeft,
      });
    }
  }

  return items;
}

export const getExpiringMembersList = getExpiringMembers;

export function getMonthlyRevenueData(payments: Payment[], expenses: Expense[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const data = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const mIndex = d.getMonth();
    const y = d.getFullYear();
    const prefix = `${y}-${String(mIndex + 1).padStart(2, '0')}`;
    const label = `${months[mIndex]} '${String(y).slice(-2)}`;

    const rev = payments
      .filter(p => {
        const pDate = p.paymentDate || p.date || '';
        return pDate.startsWith(prefix) && p.status === 'Paid';
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const exp = expenses
      .filter(e => (e.date || '').startsWith(prefix))
      .reduce((sum, e) => sum + e.amount, 0);

    data.push({
      month: label,
      revenue: rev,
      expenses: exp,
      net: rev - exp,
    });
  }

  return data;
}

// ---------------------- BACKUP & RESET ----------------------

export function exportAllDataJson(): string {
  return JSON.stringify({
    exportVersion: '2.0.0-cloud',
    exportDate: new Date().toISOString(),
    gym: cachedGym,
    plans: cachedPlans,
    members: cachedMembers,
    memberships: cachedMemberships,
    payments: cachedPayments,
    expenses: cachedExpenses,
    notifications: cachedNotifications,
  }, null, 2);
}

export function importDataJson(jsonString: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonString);
    if (data.gym) cachedGym = data.gym;
    if (data.plans) cachedPlans = data.plans;
    if (data.members) cachedMembers = data.members;
    if (data.memberships) cachedMemberships = data.memberships;
    if (data.payments) cachedPayments = data.payments;
    if (data.expenses) cachedExpenses = data.expenses;
    if (data.notifications) cachedNotifications = data.notifications;
    notifyListeners();
    return { success: true, message: 'Cloud cache populated successfully.' };
  } catch (err: any) {
    return { success: false, message: 'Invalid JSON file: ' + err.message };
  }
}

export function resetDemoData(): void {
  cachedGym = { ...INITIAL_GYM };
  cachedPlans = [...INITIAL_PLANS];
  cachedMembers = [...INITIAL_MEMBERS];
  cachedMemberships = [...INITIAL_MEMBERSHIPS];
  cachedPayments = INITIAL_PAYMENTS.map(p => ({
    ...p,
    date: p.date || p.paymentDate || getTodayString(),
    paymentDate: p.paymentDate || p.date || getTodayString(),
  }));
  cachedExpenses = [...INITIAL_EXPENSES];
  cachedNotifications = [...INITIAL_NOTIFICATIONS];
  notifyListeners();
  syncWithCloud();
}

export const resetToDemoData = resetDemoData;

