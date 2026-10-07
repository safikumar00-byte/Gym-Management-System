export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Other';

export type PaymentStatus = 'Paid' | 'Partial' | 'Pending' | 'Refunded';

export type MembershipStatus = 'Active' | 'Expiring' | 'Expired' | 'Pending';

export type MemberStatus = 'ACTIVE' | 'PAYMENT PENDING' | 'EXPIRING SOON' | 'EXPIRED' | 'INACTIVE';

export type ExpenseCategory = 
  | 'Rent' 
  | 'Electricity' 
  | 'Equipment' 
  | 'Maintenance' 
  | 'Staff Salary' 
  | 'Salaries'
  | 'Cleaning' 
  | 'Marketing'
  | 'Other';

export interface Gym {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  logo?: string;
  receiptPrefix: string;
  receiptFooter: string;
  upiId?: string;
  gstNumber?: string;
  defaultPaymentMethod: PaymentMethod;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  gymId: string;
  name: string;
  email: string;
  phone?: string;
  alternatePhone?: string;
  bio?: string;
  role: 'owner' | 'manager' | 'trainer' | 'member' | 'Owner' | 'Manager' | 'Trainer' | 'Member' | 'staff';
  isVerified?: boolean;
  verificationMethod?: 'google' | 'phone' | 'email';
  verificationDate?: string;
  createdAt: string;
}

export type User = UserProfile;

export interface MembershipPlan {
  id: string;
  gymId: string;
  name: string;
  durationMonths: number;
  durationDays?: number;
  price: number;
  description: string;
  status?: 'active' | 'inactive';
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  gymId: string;
  memberId: string; // e.g. GM-001
  name: string;
  phone: string;
  email: string;
  dateOfBirth?: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  address: string;
  emergencyContact?: string;
  joinedDate: string;
  status: MemberStatus;
  notes?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  gymId: string;
  memberId: string;
  planId: string;
  planName: string;
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  endDate?: string;
  totalFee: number;
  discount: number;
  finalAmount: number;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  gymId: string;
  memberId: string;
  memberName: string;
  membershipId: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  date?: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  receiptNumber: string; // e.g. GM-000124
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  gymId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 
  | 'PAYMENT_OVERDUE' 
  | 'MEMBERSHIP_EXPIRING' 
  | 'MEMBERSHIP_EXPIRED' 
  | 'PAYMENT_RECEIVED'
  | 'Overdue'
  | 'Expiring'
  | 'Expired'
  | 'PaymentReceived'
  | 'System'
  | 'general';

export interface NotificationItem {
  id: string;
  gymId: string;
  type: NotificationType;
  title: string;
  message: string;
  memberId?: string;
  relatedMemberId?: string;
  memberName?: string;
  amount?: number;
  date: string;
  read: boolean;
  isRead?: boolean;
  phone?: string;
}

export type Notification = NotificationItem;

export interface DashboardMetrics {
  totalMembers: number;
  activeMembers: number;
  expiringSoon: number;
  expired?: number;
  paidThisMonth?: number;
  pendingPayments?: number;
  todayCollection?: number;
  todayRevenue?: number;
  thisMonthRevenue?: number;
  monthRevenue?: number;
  thisMonthExpenses?: number;
  monthExpenses?: number;
  netIncome: number;
  pendingPaymentsCount?: number;
  pendingAmount?: number;
}

export interface PendingPaymentItem {
  id?: string;
  memberId: string;
  memberName: string;
  name?: string;
  phone: string;
  dueDate: string;
  amount: number;
  pendingAmount?: number;
  daysOverdue?: number;
  membershipId?: string;
  planName: string;
  status?: string;
}

export interface ExpiringMemberItem {
  id?: string;
  memberId: string;
  memberName: string;
  name?: string;
  phone: string;
  expiryDate: string;
  daysLeft: number;
  membershipId?: string;
  planName: string;
  planId?: string;
}

export type ChartPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'week' | 'month' | 'year' | '7D' | '30D' | '12M';
export type ExpiringMemberSummary = ExpiringMemberItem;
export type PendingPaymentSummary = PendingPaymentItem;
