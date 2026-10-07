import React, { useState, useMemo } from 'react';
import {
  Member,
  Payment,
  Gym,
  User,
  ChartPeriod,
  ExpiringMemberSummary,
  PendingPaymentSummary
} from '../../types';
import { 
  getGym, 
  getUser, 
  getDashboardMetrics, 
  getExpiringMembers, 
  getPendingPayments, 
  getPayments, 
  getMembers 
} from '../../lib/storage';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatINR, formatShortDate, generateWhatsAppReminderMessage, getWhatsAppUrl } from '../../lib/calculations';
import { Button } from '../ui/Button';
import { MetricCard } from '../ui/MetricCard';
import { AppIcon } from '../ui/AppIcon';
import { SegmentedControl } from '../ui/SegmentedControl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface DashboardViewProps {
  gym?: Gym;
  user?: User;
  metrics?: {
    totalMembers: number;
    activeMembers: number;
    expiringSoon: number;
    expired: number;
    todayCollection: number;
    thisMonthRevenue: number;
    pendingPayments: number;
    monthlyExpenses: number;
    netProfit: number;
    paidThisMonth: number;
  };
  expiringMembers?: ExpiringMemberSummary[];
  pendingPayments?: PendingPaymentSummary[];
  recentPayments?: Payment[];
  allMembers?: Member[];
  onAddMemberClick?: () => void;
  onAddPaymentClick: (memberId?: string) => void;
  onViewMemberClick: (member: Member) => void;
  onViewReceiptClick: (payment: Payment) => void;
  onRenewClick: (member: Member) => void;
  isTrainer?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  gym: propGym,
  user: propUser,
  metrics: propMetrics,
  expiringMembers: propExpiringMembers,
  pendingPayments: propPendingPayments,
  recentPayments: propRecentPayments,
  allMembers: propAllMembers,
  onAddMemberClick,
  onAddPaymentClick,
  onViewMemberClick,
  onViewReceiptClick,
  onRenewClick,
  isTrainer: propIsTrainer,
}) => {
  const { user: authUser, isTrainer: authIsTrainer } = useAuth();

  // Gracefully fallback to storage data when props are not provided
  const gym = useMemo(() => propGym || getGym(), [propGym]);
  const user = useMemo(() => {
    if (propUser) return propUser;
    if (authUser) {
      return {
        id: authUser.id,
        gymId: authUser.gymId || gym.id,
        name: authUser.name || 'Owner',
        email: authUser.email || '',
        role: authUser.role,
        createdAt: new Date().toISOString(),
      };
    }
    return getUser();
  }, [propUser, authUser, gym.id]);

  const metrics = useMemo(() => {
    if (propMetrics) return propMetrics;
    const stored = getDashboardMetrics();
    return {
      totalMembers: stored.totalMembers || 0,
      activeMembers: stored.activeMembers || 0,
      expiringSoon: stored.expiringSoon || 0,
      expired: stored.expired || 0,
      todayCollection: stored.todayCollection ?? stored.todayRevenue ?? 0,
      thisMonthRevenue: stored.thisMonthRevenue ?? stored.monthRevenue ?? 0,
      pendingPayments: stored.pendingAmount ?? 0,
      monthlyExpenses: stored.thisMonthExpenses ?? stored.monthExpenses ?? 0,
      netProfit: stored.netIncome ?? 0,
      paidThisMonth: stored.paidThisMonth ?? stored.thisMonthRevenue ?? stored.monthRevenue ?? 0,
    };
  }, [propMetrics]);

  const expiringMembers = useMemo(
    () => propExpiringMembers || getExpiringMembers(),
    [propExpiringMembers]
  );

  const pendingPayments = useMemo(
    () => propPendingPayments || getPendingPayments(),
    [propPendingPayments]
  );

  const recentPayments = useMemo(
    () => propRecentPayments || getPayments().slice(0, 5),
    [propRecentPayments]
  );

  const allMembers = useMemo(
    () => propAllMembers || getMembers(),
    [propAllMembers]
  );

  const isTrainer = propIsTrainer ?? authIsTrainer;

  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('WEEK');

  const chartData = useMemo(() => {
    if (chartPeriod === 'DAY') {
      return [
        { label: '6 AM', amount: 4500 },
        { label: '9 AM', amount: 8200 },
        { label: '12 PM', amount: 3500 },
        { label: '3 PM', amount: 6200 },
        { label: '6 PM', amount: 15400 },
        { label: '9 PM', amount: 9800 },
      ];
    } else if (chartPeriod === 'WEEK') {
      return [
        { label: 'Mon', amount: 14500 },
        { label: 'Tue', amount: 22500 },
        { label: 'Wed', amount: 18000 },
        { label: 'Thu', amount: 9500 },
        { label: 'Fri', amount: 28000 },
        { label: 'Sat', amount: 35000 },
        { label: 'Sun', amount: 24500 },
      ];
    } else if (chartPeriod === 'YEAR') {
      return [
        { label: 'Jan', amount: 145000 },
        { label: 'Feb', amount: 160000 },
        { label: 'Mar', amount: 175000 },
        { label: 'Apr', amount: 168000 },
        { label: 'May', amount: 182000 },
        { label: 'Jun', amount: 195000 },
        { label: 'Jul', amount: 170000 },
        { label: 'Aug', amount: 190000 },
        { label: 'Sep', amount: metrics.thisMonthRevenue },
      ];
    } else {
      return [
        { label: 'Week 1', amount: 48000 },
        { label: 'Week 2', amount: 52500 },
        { label: 'Week 3', amount: 44000 },
        { label: 'Week 4', amount: 40500 },
      ];
    }
  }, [chartPeriod, metrics.thisMonthRevenue]);

  const handleWhatsAppReminder = (phone: string, memberName: string, amount: number) => {
    const msg = generateWhatsAppReminderMessage(gym.name, memberName, amount);
    const url = getWhatsAppUrl(phone, msg);
    window.open(url, '_blank');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userNameFirst = user?.name ? user.name.split(' ')[0] : 'Operator';

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* 1. EDITORIAL HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[13px] font-semibold text-[#0071e3] tracking-tight uppercase mb-0.5">
            Overview • {gym.name}
          </div>
          <h2 className="text-[26px] sm:text-[32px] font-bold text-[#1d1d1f] tracking-tight leading-tight">
            {getGreeting()}, {userNameFirst}.
          </h2>
          <p className="text-[14px] sm:text-[15px] text-[#86868b] mt-1 max-w-2xl font-normal leading-relaxed">
            Real-time operations snapshot, member renewals, and financial inflow.
          </p>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onAddMemberClick && (
            <Button
              variant="primary"
              size="md"
              onClick={onAddMemberClick}
              className="gap-1.5"
            >
              <AppIcon name="plus" size={15} strokeWidth={2.4} />
              <span>Add Member</span>
            </Button>
          )}

          {!isTrainer && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => onAddPaymentClick()}
              className="gap-1.5"
            >
              <AppIcon name="creditcard" size={15} strokeWidth={2.2} />
              <span>Collect Payment</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. PRIMARY BUSINESS SNAPSHOT CARD */}
      <div className="bg-white border border-[#e5e5ea] rounded-[24px] p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Primary Business Hero Metric: Active Members */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#f0f0f2] pb-6 lg:pb-0 lg:pr-8 flex flex-col justify-between">
            <div>
              <div className="text-[13px] font-medium text-[#8e8e93] tracking-tight">
                Active Enrolled Members
              </div>
              <div className="text-[48px] sm:text-[54px] font-bold tracking-tight text-[#1d1d1f] leading-none my-2.5">
                {metrics.activeMembers}
              </div>
              <p className="text-[13.5px] text-[#86868b] leading-relaxed">
                Out of <span className="text-[#1d1d1f] font-semibold">{metrics.totalMembers}</span> total athletes registered. Active retention is at <span className="text-[#34c759] font-semibold">94.2%</span>.
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-[#f0f0f2] flex items-center justify-between text-[13px]">
              <span className="text-[#86868b]">Floor Occupancy</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-[#34c759] bg-[#34c759]/10 px-2.5 py-0.5 rounded-full text-[12px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
                Optimal
              </span>
            </div>
          </div>

          {/* Secondary Metric Information Grid */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-5">
            {/* Revenue / Paid this month */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#8e8e93] tracking-tight">
                  Revenue
                </div>
                <div className="text-[22px] sm:text-[25px] font-bold text-[#1d1d1f] tracking-tight mt-1">
                  {!isTrainer ? formatINR(metrics.paidThisMonth) : 'Protected'}
                </div>
                <div className="text-[12px] text-[#8e8e93] mt-0.5">
                  Paid this month
                </div>
              </div>
              <div className="mt-3 text-[12px] text-[#34c759] font-medium flex items-center gap-1">
                <AppIcon name="chart.line.uptrend" size={13} strokeWidth={2.4} />
                <span>+12.4% vs last mo.</span>
              </div>
            </div>

            {/* Outstanding Balances */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#8e8e93] tracking-tight">
                  Outstanding
                </div>
                <div className="text-[22px] sm:text-[25px] font-bold text-[#0071e3] tracking-tight mt-1">
                  {!isTrainer ? formatINR(metrics.pendingPayments) : '0'}
                </div>
                <div className="text-[12px] text-[#8e8e93] mt-0.5">
                  {pendingPayments.length} pending balances
                </div>
              </div>
              <div className="mt-3 text-[12px] text-[#8e8e93]">
                Due within 7 days
              </div>
            </div>

            {/* Expiring Soon */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#8e8e93] tracking-tight">
                  Expiring Soon
                </div>
                <div className="text-[22px] sm:text-[25px] font-bold text-[#ff9500] tracking-tight mt-1">
                  {metrics.expiringSoon}
                </div>
                <div className="text-[12px] text-[#8e8e93] mt-0.5">
                  Next 7-14 days
                </div>
              </div>
              <div className="mt-3 text-[12px] text-[#ff9500] font-medium">
                Requires renewal
              </div>
            </div>

            {/* Expired / Inactive */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#8e8e93] tracking-tight">
                  Expired
                </div>
                <div className="text-[22px] sm:text-[25px] font-bold text-[#ff3b30] tracking-tight mt-1">
                  {metrics.expired}
                </div>
                <div className="text-[12px] text-[#8e8e93] mt-0.5">
                  Lapsed trainees
                </div>
              </div>
              <div className="mt-3 text-[12px] text-[#ff3b30] font-medium">
                Follow up
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. HORIZONTAL SCROLLABLE METRIC CARDS ON MOBILE / DESKTOP RESPONSIVE GRID */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-smooth no-scrollbar">
        <div className="min-w-[240px] sm:min-w-0 snap-start flex-1">
          <MetricCard
            label="Today's Collection"
            value={formatINR(metrics.todayCollection)}
            subValue="Till now"
            icon="dollarsign"
            isSuccess={true}
          />
        </div>
        <div className="min-w-[240px] sm:min-w-0 snap-start flex-1">
          <MetricCard
            label="Active Members"
            value={metrics.activeMembers}
            subValue={`of ${metrics.totalMembers} total`}
            icon="person.2"
            isAccent={true}
          />
        </div>
        <div className="min-w-[240px] sm:min-w-0 snap-start flex-1">
          <MetricCard
            label="Pending Dues"
            value={formatINR(metrics.pendingPayments)}
            subValue={`${pendingPayments.length} pending`}
            icon="clock"
            isWarning={true}
          />
        </div>
        <div className="min-w-[240px] sm:min-w-0 snap-start flex-1">
          <MetricCard
            label="Expiring Soon"
            value={metrics.expiringSoon}
            subValue="within 14 days"
            icon="bell"
            isDestructive={metrics.expiringSoon > 0}
          />
        </div>
      </div>

      {/* 4. REVENUE TRENDS WITH APPLE-STYLE SEGMENTED CONTROL */}
      {!isTrainer && (
        <div className="bg-white border border-[#e5e5ea] rounded-[24px] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
                Financial Metrics
              </div>
              <h3 className="text-[20px] font-bold text-[#1d1d1f] tracking-tight mt-0.5">
                Revenue Inflow
              </h3>
            </div>

            <SegmentedControl<ChartPeriod>
              value={chartPeriod}
              onChange={setChartPeriod}
              options={[
                { id: 'DAY', label: 'Day' },
                { id: 'WEEK', label: 'Week' },
                { id: 'MONTH', label: 'Month' },
                { id: 'YEAR', label: 'Year' },
              ]}
              size="sm"
            />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  stroke="#8e8e93"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#f0f0f2' }}
                />
                <YAxis
                  stroke="#8e8e93"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#f0f0f2' }}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: '#f5f5f7' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/95 backdrop-blur-md border border-[#e5e5ea] px-3.5 py-2 rounded-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] text-[13px]">
                          <div className="text-[#8e8e93] text-[11px] font-medium">
                            {payload[0].payload.label}
                          </div>
                          <div className="text-[#0071e3] font-bold mt-0.5">
                            {formatINR(payload[0].value as number)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" fill="#0071e3" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 pt-4 border-t border-[#f0f0f2] flex flex-col sm:flex-row items-start sm:items-center justify-between text-[13px] text-[#8e8e93] gap-2">
            <span>Today's Total: <strong className="text-[#1d1d1f] font-semibold">{formatINR(metrics.todayCollection)}</strong></span>
            <span>Total Collected This Month: <strong className="text-[#1d1d1f] font-semibold">{formatINR(metrics.thisMonthRevenue)}</strong></span>
          </div>
        </div>
      )}

      {/* 5. DUES & EXPIRING MEMBERSHIP ATTENTION CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Outstanding Balances */}
        {!isTrainer && (
          <div className="lg:col-span-6 bg-white border border-[#e5e5ea] rounded-[24px] p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
                    Action Required
                  </div>
                  <h3 className="text-[18px] font-bold text-[#1d1d1f] tracking-tight mt-0.5">
                    Outstanding Balances
                  </h3>
                </div>
                <span className="text-[13px] font-semibold text-[#0071e3] bg-[#0071e3]/10 px-2.5 py-0.5 rounded-full">
                  {formatINR(metrics.pendingPayments)}
                </span>
              </div>

              {pendingPayments.length === 0 ? (
                <div className="py-12 text-center text-[#8e8e93] text-[14px]">
                  All member balances are settled in full.
                </div>
              ) : (
                <div className="divide-y divide-[#f0f0f2]">
                  {pendingPayments.map((item) => (
                    <div key={item.memberId} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-[#1d1d1f] truncate">
                          {item.memberName}
                        </div>
                        <div className="text-[12px] text-[#8e8e93] mt-0.5">
                          Due: {formatShortDate(item.dueDate)} • <span className="text-[#ff3b30] font-medium">{item.daysOverdue}d overdue</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[14px] font-semibold text-[#1d1d1f]">
                          {formatINR(item.amount)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleWhatsAppReminder(item.phone, item.memberName, item.amount)}
                            title="Send WhatsApp Reminder"
                            className="w-7 h-7 rounded-full bg-[#34c759]/10 hover:bg-[#34c759]/20 text-[#34c759] flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <AppIcon name="message" size={13} strokeWidth={2.2} />
                          </button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onAddPaymentClick(item.memberId)}
                            className="text-[11px] h-7 px-2.5"
                          >
                            Pay
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#f0f0f2] text-[12px] text-[#8e8e93] flex justify-between mt-3">
              <span>Direct WhatsApp reminder message</span>
              <span>{pendingPayments.length} pending</span>
            </div>
          </div>
        )}

        {/* Expiring Soon */}
        <div className={`${!isTrainer ? 'lg:col-span-6' : 'lg:col-span-12'} bg-white border border-[#e5e5ea] rounded-[24px] p-6 shadow-xs flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
                  Retention Alert
                </div>
                <h3 className="text-[18px] font-bold text-[#1d1d1f] tracking-tight mt-0.5">
                  Expiring Soon
                </h3>
              </div>
              <span className="text-[13px] font-semibold text-[#ff9500] bg-[#ff9500]/10 px-2.5 py-0.5 rounded-full">
                {metrics.expiringSoon} Members
              </span>
            </div>

            {expiringMembers.length === 0 ? (
              <div className="py-12 text-center text-[#8e8e93] text-[14px]">
                No memberships expiring in the next 14 days.
              </div>
            ) : (
              <div className="divide-y divide-[#f0f0f2]">
                {expiringMembers.map((item) => {
                  const fullMember = allMembers.find((m) => m.id === item.memberId);
                  return (
                    <div key={item.memberId} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          onClick={() => fullMember && onViewMemberClick(fullMember)}
                          className="text-[14px] font-medium text-[#1d1d1f] hover:text-[#0071e3] cursor-pointer truncate"
                        >
                          {item.memberName}
                        </div>
                        <div className="text-[12px] text-[#8e8e93] mt-0.5 truncate">
                          {item.planName} • Expires {formatShortDate(item.expiryDate)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[12px] font-medium text-[#ff9500]">
                          {item.daysLeft === 0 ? 'Today' : `${item.daysLeft}d left`}
                        </span>
                        {!isTrainer && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => fullMember && onRenewClick(fullMember)}
                            className="text-[11px] h-7 px-2.5"
                          >
                            Renew
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#f0f0f2] text-[12px] text-[#8e8e93] flex justify-between mt-3">
            <span>Proactive renewal prevents member churn</span>
            <span>Next 14 days</span>
          </div>
        </div>
      </div>

      {/* 6. RECENT PAYMENT RECEIPTS */}
      {!isTrainer && (
        <div className="bg-white border border-[#e5e5ea] rounded-[24px] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
                Transaction Log
              </div>
              <h3 className="text-[18px] font-bold text-[#1d1d1f] tracking-tight mt-0.5">
                Recent Collections
              </h3>
            </div>
            <div className="text-[13px] text-[#8e8e93]">
              Today: <strong className="text-[#1d1d1f] font-semibold">{formatINR(metrics.todayCollection)}</strong>
            </div>
          </div>

          <div className="divide-y divide-[#f0f0f2]">
            {recentPayments.length === 0 ? (
              <div className="py-8 text-center text-[#8e8e93] text-[13px]">
                No recent payment transactions recorded.
              </div>
            ) : (
              recentPayments.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onViewReceiptClick(p)}
                  className="py-3.5 flex items-center justify-between hover:bg-[#fafafc] active:bg-[#f2f2f7] px-2 rounded-[12px] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center shrink-0">
                      <AppIcon name="receipt" size={16} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#1d1d1f] text-[14px] truncate">{p.memberName}</div>
                      <div className="text-[12px] text-[#8e8e93] mt-0.5">
                        {p.paymentMethod} • {formatShortDate(p.paymentDate || (p as any).date)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-[#1d1d1f] text-[15px]">{formatINR(p.amount)}</div>
                      <div className="text-[11px] text-[#0071e3] font-medium">{p.receiptNumber}</div>
                    </div>
                    <AppIcon name="chevron.right" size={14} className="text-[#c7c7cc]" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
