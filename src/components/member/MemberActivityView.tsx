import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import {
  Calendar as CalendarIcon,
  Clock,
  Dumbbell,
  CreditCard,
  Trophy,
  Users,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Sparkles,
  Flame,
  Award,
  ArrowUpRight,
  FileText,
  RotateCcw,
  Check,
  X,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { MemberReceiptModal } from './MemberReceiptModal';
import { MemberNavTab } from './MemberShell';

interface MemberActivityViewProps {
  onNavigate: (tab: MemberNavTab) => void;
}

export type ActivityFilterType = 'ALL' | 'ATTENDANCE' | 'WORKOUT' | 'PAYMENT' | 'MEMBERSHIP' | 'COMMUNITY' | 'ACHIEVEMENT';

export const MemberActivityView: React.FC<MemberActivityViewProps> = ({ onNavigate }) => {
  const { userProfile, gym, linkedMember } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activeFilter, setActiveFilter] = useState<ActivityFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Date Range State (From / To filtering)
  const [dateRangeFrom, setDateRangeFrom] = useState<string | null>(null);
  const [dateRangeTo, setDateRangeTo] = useState<string | null>(null);
  const [dateRangePreset, setDateRangePreset] = useState<'ALL' | 'THIS_MONTH' | 'LAST_30' | 'LAST_90' | 'CUSTOM'>('ALL');
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [customFromInput, setCustomFromInput] = useState('');
  const [customToInput, setCustomToInput] = useState('');

  const [viewMode, setViewMode] = useState<'timeline' | 'calendar' | 'achievements'>('timeline');

  // Calendar month state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Selected Activity for Detail Sheet
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any | null>(null);

  const fetchActivityData = async (isFilterChange = false) => {
    try {
      if (isFilterChange) {
        setLoading(true);
      }
      const params: any = {
        limit: 50,
      };
      if (activeFilter !== 'ALL') params.type = activeFilter;
      if (selectedDate) {
        params.date = selectedDate;
      } else {
        if (dateRangeFrom) params.from = dateRangeFrom;
        if (dateRangeTo) params.to = dateRangeTo;
      }
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getMemberActivity(params);
      setData(res);
      const incoming: any[] = res.activities || [];
      setActivitiesList(incoming);
      const serverTotal = res.totalActivitiesCount ?? incoming.length;
      setTotalCount(serverTotal);
      setHasMore(res.hasMore ?? (incoming.length < serverTotal));
    } catch (err: any) {
      console.error('Failed to load member activity:', err);
      showToast(err.message || 'Failed to load member activity', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActivityData(true);
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [activeFilter, selectedDate, dateRangeFrom, dateRangeTo, searchQuery]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const params: any = {
        offset: activitiesList.length,
        limit: 50,
      };
      if (activeFilter !== 'ALL') params.type = activeFilter;
      if (selectedDate) {
        params.date = selectedDate;
      } else {
        if (dateRangeFrom) params.from = dateRangeFrom;
        if (dateRangeTo) params.to = dateRangeTo;
      }
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getMemberActivity(params);
      const incoming: any[] = res.activities || [];

      setActivitiesList((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        const filteredNew = incoming.filter((a) => !seen.has(a.id));
        const combined = [...prev, ...filteredNew];
        // Chronological descending sort
        return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });

      const serverTotal = res.totalActivitiesCount ?? totalCount;
      setTotalCount(serverTotal);
      setHasMore(res.hasMore ?? (activitiesList.length + incoming.length < serverTotal));
    } catch (err: any) {
      console.error('Failed to load more activities:', err);
      showToast(err.message || 'Failed to load more activities', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const applyDateRangePreset = (preset: 'ALL' | 'THIS_MONTH' | 'LAST_30' | 'LAST_90' | 'CUSTOM') => {
    setDateRangePreset(preset);
    setSelectedDate(null); // Clear single-day selection
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setDateRangeFrom(null);
      setDateRangeTo(null);
      setShowDateRangePicker(false);
    } else if (preset === 'THIS_MONTH') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setDateRangeFrom(startOfMonth);
      setDateRangeTo(todayStr);
      setShowDateRangePicker(false);
    } else if (preset === 'LAST_30') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setDateRangeFrom(d.toISOString().split('T')[0]);
      setDateRangeTo(todayStr);
      setShowDateRangePicker(false);
    } else if (preset === 'LAST_90') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setDateRangeFrom(d.toISOString().split('T')[0]);
      setDateRangeTo(todayStr);
      setShowDateRangePicker(false);
    } else if (preset === 'CUSTOM') {
      setShowDateRangePicker(true);
    }
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFromInput) return;
    setDateRangeFrom(customFromInput);
    setDateRangeTo(customToInput || new Date().toISOString().split('T')[0]);
    setShowDateRangePicker(false);
  };

  const summary = data?.summary || {
    totalCheckins: 0,
    thisMonthCheckins: 0,
    currentStreak: 0,
    longestStreak: 0,
    checkedInToday: false,
    totalWorkouts: 0,
    completedWorkouts: 0,
    completionRate: 0,
    totalPayments: 0,
    totalSpent: 0,
    personalRecordsCount: 0,
    unlockedAchievementsCount: 0,
    totalAchievementsCount: 0,
  };

  const thisWeek: any[] = data?.thisWeek || [];
  const calendarDays: Record<string, any> = data?.calendarDays || {};
  const personalRecords: any[] = data?.personalRecords || [];
  const achievements: any[] = data?.achievements || [];

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const act of activitiesList) {
      if (!groups[act.date]) {
        groups[act.date] = [];
      }
      groups[act.date].push(act);
    }
    return Object.entries(groups).sort(
      ([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime()
    );
  }, [activitiesList]);

  // Calendar calculation
  const [currentYear, currentMonthNumber] = calendarMonth.split('-').map(Number);
  const daysInMonth = new Date(currentYear, currentMonthNumber, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonthNumber - 1, 1).getDay() + 6) % 7; // Monday = 0

  const handlePrevMonth = () => {
    const prev = new Date(currentYear, currentMonthNumber - 2, 1);
    const newMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    setCalendarMonth(newMonth);
    if (selectedDate && !selectedDate.startsWith(newMonth)) {
      setSelectedDate(null);
    }
  };

  const handleNextMonth = () => {
    const next = new Date(currentYear, currentMonthNumber, 1);
    const newMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    setCalendarMonth(newMonth);
    if (selectedDate && !selectedDate.startsWith(newMonth)) {
      setSelectedDate(null);
    }
  };

  const monthName = new Date(currentYear, currentMonthNumber - 1, 1).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ATTENDANCE':
        return <CheckCircle2 size={16} className="text-[#34c759]" />;
      case 'WORKOUT':
        return <Dumbbell size={16} className="text-[#af52de]" />;
      case 'PAYMENT':
        return <CreditCard size={16} className="text-[#0071e3]" />;
      case 'MEMBERSHIP':
        return <ShieldCheck size={16} className="text-[#ff9500]" />;
      case 'COMMUNITY':
        return <Users size={16} className="text-[#ff2d55]" />;
      case 'ACHIEVEMENT':
        return <Trophy size={16} className="text-[#ff9500]" />;
      default:
        return <Clock size={16} className="text-[#8e8e93]" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case 'ATTENDANCE':
        return 'bg-[#34c759]/10 border-[#34c759]/20';
      case 'WORKOUT':
        return 'bg-[#af52de]/10 border-[#af52de]/20';
      case 'PAYMENT':
        return 'bg-[#0071e3]/10 border-[#0071e3]/20';
      case 'MEMBERSHIP':
        return 'bg-[#ff9500]/10 border-[#ff9500]/20';
      case 'COMMUNITY':
        return 'bg-[#ff2d55]/10 border-[#ff2d55]/20';
      case 'ACHIEVEMENT':
        return 'bg-[#ff9500]/10 border-[#ff9500]/20';
      default:
        return 'bg-[#f2f2f7] border-[#e5e5ea]';
    }
  };

  const formatDateHeader = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';

    const d = new Date(dateStr);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleOpenActivityDetail = (activity: any) => {
    setSelectedActivity(activity);
  };

  const handleViewReceiptFromPayment = (metadata: any) => {
    setSelectedPaymentForReceipt({
      id: metadata.paymentId,
      receiptNumber: metadata.receiptNumber,
      amount: metadata.amount,
      paymentMethod: metadata.paymentMethod,
      status: metadata.status,
      paymentDate: metadata.paymentDate,
      notes: metadata.notes,
    });
    setIsReceiptModalOpen(true);
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6">
        <div className="h-44 bg-white rounded-[24px] border border-[#e5e5ea] animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white rounded-[18px] border border-[#e5e5ea] animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-[24px] border border-[#e5e5ea] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 1. Header Overview & Metrics Banner */}
      <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold tracking-widest text-[#86868b] uppercase">
              Personal Fitness Journey
            </div>
            <h1 className="text-[26px] font-bold text-[#1d1d1f] tracking-tight">
              Activity & History
            </h1>
            <p className="text-[13px] text-[#6e6e73]">
              Your continuous timeline of gym visits, workouts, milestones, and receipts.
            </p>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-full border border-[#e5e5ea] self-start sm:self-auto">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-white text-[#1d1d1f] shadow-xs'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f]'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-[#1d1d1f] shadow-xs'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f]'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('achievements')}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                viewMode === 'achievements'
                  ? 'bg-white text-[#1d1d1f] shadow-xs'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f]'
              }`}
            >
              Milestones
            </button>
          </div>
        </div>

        {/* Compact stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 bg-[#fbfbfd] border border-[#e5e5ea] rounded-[18px]">
            <div className="flex items-center justify-between text-[#34c759] mb-1">
              <CheckCircle2 size={16} />
              <span className="text-[10px] font-semibold uppercase text-[#86868b]">This Month</span>
            </div>
            <div className="text-[20px] font-bold text-[#1d1d1f]">
              {summary.thisMonthCheckins}
            </div>
            <div className="text-[11px] text-[#6e6e73] font-medium">Gym Visits</div>
          </div>

          <div className="p-3.5 bg-[#fbfbfd] border border-[#e5e5ea] rounded-[18px]">
            <div className="flex items-center justify-between text-[#ff9500] mb-1">
              <Flame size={16} />
              <span className="text-[10px] font-semibold uppercase text-[#86868b]">Active</span>
            </div>
            <div className="text-[20px] font-bold text-[#1d1d1f]">
              {summary.currentStreak} <span className="text-[13px] font-normal text-[#86868b]">days</span>
            </div>
            <div className="text-[11px] text-[#6e6e73] font-medium">Current Streak</div>
          </div>

          <div className="p-3.5 bg-[#fbfbfd] border border-[#e5e5ea] rounded-[18px]">
            <div className="flex items-center justify-between text-[#af52de] mb-1">
              <Dumbbell size={16} />
              <span className="text-[10px] font-semibold uppercase text-[#86868b]">{summary.completionRate}% rate</span>
            </div>
            <div className="text-[20px] font-bold text-[#1d1d1f]">
              {summary.completedWorkouts}
            </div>
            <div className="text-[11px] text-[#6e6e73] font-medium">Routines Completed</div>
          </div>

          <div className="p-3.5 bg-[#fbfbfd] border border-[#e5e5ea] rounded-[18px]">
            <div className="flex items-center justify-between text-[#ff2d55] mb-1">
              <Award size={16} />
              <span className="text-[10px] font-semibold uppercase text-[#86868b]">Strength</span>
            </div>
            <div className="text-[20px] font-bold text-[#1d1d1f]">
              {summary.personalRecordsCount}
            </div>
            <div className="text-[11px] text-[#6e6e73] font-medium">Personal Records</div>
          </div>
        </div>

        {/* This Week Row */}
        <div className="pt-2 border-t border-[#f0f0f2]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868b] mb-2">
            This Week's Activity
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {thisWeek.map((item) => (
              <div
                key={item.date}
                onClick={() => {
                  setSelectedDate(item.date);
                  setViewMode('timeline');
                }}
                className={`flex flex-col items-center p-2 rounded-[14px] border text-center transition-all cursor-pointer ${
                  selectedDate === item.date
                    ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                    : item.isToday
                    ? 'bg-[#0071e3]/10 border-[#0071e3]/30 text-[#0071e3]'
                    : item.hasAttendance || item.workout?.status === 'COMPLETED'
                    ? 'bg-[#f4fcf6] border-[#34c759]/30 text-[#1d1d1f]'
                    : 'bg-[#fafafc] border-[#e5e5ea] text-[#86868b]'
                }`}
              >
                <span className="text-[10px] font-bold uppercase">{item.day}</span>
                <span className="text-[13px] font-bold my-0.5">
                  {new Date(item.date).getDate()}
                </span>
                <div className="flex items-center justify-center gap-0.5 mt-0.5 h-3">
                  {item.hasAttendance && (
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedDate === item.date ? 'bg-white' : 'bg-[#34c759]'}`} />
                  )}
                  {item.workout?.status === 'COMPLETED' && (
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedDate === item.date ? 'bg-white' : 'bg-[#af52de]'}`} />
                  )}
                  {!item.hasAttendance && !item.workout && (
                    <span className={`w-1 h-1 rounded-full ${selectedDate === item.date ? 'bg-white/40' : 'bg-[#d2d2d7]'}`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. CALENDAR VIEW MODE */}
      {viewMode === 'calendar' && (
        <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-[#1d1d1f] tracking-tight">
              {monthName}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-[#f5f5f7] rounded-full border border-[#e5e5ea] transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-[#f5f5f7] rounded-full border border-[#e5e5ea] transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-[#86868b] py-1">
                {d}
              </div>
            ))}

            {/* Blank leading days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-16 rounded-[14px] bg-[#fafafc]/50" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${calendarMonth}-${String(dayNum).padStart(2, '0')}`;
              const dayActivity = calendarDays[dateStr];
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const isSelected = selectedDate === dateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(isSelected ? null : dateStr);
                  }}
                  className={`h-16 p-2 rounded-[14px] border flex flex-col justify-between transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-[#0071e3] bg-[#0071e3]/5 ring-2 ring-[#0071e3]/20 shadow-xs'
                      : isToday
                      ? 'border-[#0071e3]/40 bg-[#f0f7ff]'
                      : dayActivity
                      ? 'border-[#e5e5ea] bg-white hover:border-[#0071e3]/30'
                      : 'border-[#f2f2f7] bg-[#fafafc] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[12px] font-semibold ${isToday ? 'text-[#0071e3] font-bold' : 'text-[#1d1d1f]'}`}>
                      {dayNum}
                    </span>
                    {dayActivity?.count > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#f2f2f7] text-[#6e6e73]">
                        {dayActivity.count}
                      </span>
                    )}
                  </div>

                  {/* Activity indicators */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {dayActivity?.attendance && (
                      <span className="w-2 h-2 rounded-full bg-[#34c759]" title="Gym Check-in" />
                    )}
                    {dayActivity?.workout && (
                      <span className="w-2 h-2 rounded-full bg-[#af52de]" title="Workout Routine" />
                    )}
                    {dayActivity?.payment && (
                      <span className="w-2 h-2 rounded-full bg-[#0071e3]" title="Payment Receipt" />
                    )}
                    {dayActivity?.community && (
                      <span className="w-2 h-2 rounded-full bg-[#ff2d55]" title="Community Post" />
                    )}
                    {dayActivity?.achievement && (
                      <span className="w-2 h-2 rounded-full bg-[#ff9500]" title="Milestone" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Legend */}
          <div className="pt-3 border-t border-[#f0f0f2] flex items-center justify-center gap-4 flex-wrap text-[11px] text-[#6e6e73]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#34c759]" />
              <span>Gym Check-in</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#af52de]" />
              <span>Workout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0071e3]" />
              <span>Payment Receipt</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff2d55]" />
              <span>Community</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff9500]" />
              <span>Milestone Achievement</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. ACHIEVEMENTS & PERSONAL RECORDS VIEW MODE */}
      {viewMode === 'achievements' && (
        <div className="space-y-6">
          {/* Personal Records Showcase */}
          <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-bold text-[#1d1d1f] tracking-tight">
                  Personal Records (PRs)
                </h2>
                <p className="text-[12px] text-[#6e6e73]">
                  Highest recorded weights from your verified workout logs.
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#ff2d55]/10 text-[#ff2d55] border border-[#ff2d55]/20">
                {personalRecords.length} Max Lifts
              </span>
            </div>

            {personalRecords.length === 0 ? (
              <div className="p-8 text-center text-[#86868b] border border-dashed border-[#e5e5ea] rounded-[20px]">
                <Dumbbell size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-[13px] font-medium">Personal records will appear as you complete workouts with weights.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {personalRecords.map((pr) => (
                  <div
                    key={pr.exercise}
                    className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[18px] space-y-1"
                  >
                    <div className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
                      {pr.exercise}
                    </div>
                    <div className="text-[24px] font-extrabold text-[#1d1d1f] tracking-tight">
                      {pr.maxWeight}
                    </div>
                    <div className="text-[11px] text-[#6e6e73]">
                      Logged on {new Date(pr.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Milestone Badges Showcase */}
          <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-bold text-[#1d1d1f] tracking-tight">
                  Milestone Badges
                </h2>
                <p className="text-[12px] text-[#6e6e73]">
                  Achievements unlocked by maintaining consistency and hitting milestones.
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#ff9500]/10 text-[#b25e00] border border-[#ff9500]/20">
                {summary.unlockedAchievementsCount} / {summary.totalAchievementsCount} Unlocked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-4 rounded-[20px] border transition-all flex items-start gap-3.5 ${
                    ach.unlocked
                      ? 'bg-[#fffbf0] border-[#ff9500]/30 shadow-xs'
                      : 'bg-[#fafafc] border-[#e5e5ea] opacity-65'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${
                      ach.unlocked
                        ? 'bg-[#ff9500] text-white shadow-xs'
                        : 'bg-[#e5e5ea] text-[#8e8e93]'
                    }`}
                  >
                    <Trophy size={20} />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[14px] text-[#1d1d1f]">{ach.title}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full ${
                          ach.unlocked
                            ? 'bg-[#34c759]/15 text-[#34c759]'
                            : 'bg-[#8e8e93]/15 text-[#8e8e93]'
                        }`}
                      >
                        {ach.unlocked ? 'Unlocked' : 'In Progress'}
                      </span>
                    </div>

                    <p className="text-[12px] text-[#6e6e73] leading-relaxed">
                      {ach.description}
                    </p>

                    {ach.unlocked && ach.unlockedAt && (
                      <div className="text-[10px] font-medium text-[#b25e00] pt-1">
                        Unlocked on {new Date(ach.unlockedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}

                    {!ach.unlocked && ach.progress && (
                      <div className="text-[11px] font-semibold text-[#0071e3] pt-1">
                        Progress: {ach.progress}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. ACTIVITY TIMELINE VIEW (PRIMARY EXPERIENCE) */}
      <div className="space-y-4">
        {/* Filters, Date Range & Search Bar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Horizontal Scrollable Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'ALL' as ActivityFilterType, label: 'All Activity' },
                { id: 'ATTENDANCE' as ActivityFilterType, label: 'Visits' },
                { id: 'WORKOUT' as ActivityFilterType, label: 'Workouts' },
                { id: 'PAYMENT' as ActivityFilterType, label: 'Payments' },
                { id: 'MEMBERSHIP' as ActivityFilterType, label: 'Pass' },
                { id: 'COMMUNITY' as ActivityFilterType, label: 'Community' },
                { id: 'ACHIEVEMENT' as ActivityFilterType, label: 'Milestones' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setActiveFilter(f.id);
                    if (selectedDate) setSelectedDate(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                    activeFilter === f.id
                      ? 'bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-xs'
                      : 'bg-white text-[#6e6e73] hover:text-[#1d1d1f] border-[#e5e5ea]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Date Range Preset & Search Input */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              {/* Date Range Selector Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                    dateRangeFrom || dateRangeTo
                      ? 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/30'
                      : 'bg-white text-[#6e6e73] hover:text-[#1d1d1f] border-[#e5e5ea]'
                  }`}
                >
                  <CalendarIcon size={13} />
                  <span>
                    {dateRangePreset === 'ALL'
                      ? 'Date Range'
                      : dateRangePreset === 'THIS_MONTH'
                      ? 'This Month'
                      : dateRangePreset === 'LAST_30'
                      ? 'Last 30 Days'
                      : dateRangePreset === 'LAST_90'
                      ? 'Last 90 Days'
                      : 'Custom Range'}
                  </span>
                </button>

                {/* Popover Menu */}
                {showDateRangePicker && (
                  <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white rounded-[18px] border border-[#e5e5ea] shadow-xl z-30 space-y-2 text-[12px]">
                    <div className="font-bold text-[#1d1d1f] pb-1 border-b border-[#f0f0f2]">
                      Filter by Date Range
                    </div>
                    <div className="space-y-1">
                      {[
                        { id: 'ALL' as const, label: 'All Time' },
                        { id: 'THIS_MONTH' as const, label: 'This Month' },
                        { id: 'LAST_30' as const, label: 'Last 30 Days' },
                        { id: 'LAST_90' as const, label: 'Last 90 Days' },
                        { id: 'CUSTOM' as const, label: 'Custom Range...' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyDateRangePreset(p.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-[10px] font-medium transition-colors cursor-pointer ${
                            dateRangePreset === p.id
                              ? 'bg-[#0071e3]/10 text-[#0071e3] font-bold'
                              : 'text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {dateRangePreset === 'CUSTOM' && (
                      <form onSubmit={handleApplyCustomRange} className="pt-2 border-t border-[#f0f0f2] space-y-2">
                        <div>
                          <label className="text-[10px] font-bold text-[#86868b] uppercase">From Date</label>
                          <input
                            type="date"
                            value={customFromInput}
                            onChange={(e) => setCustomFromInput(e.target.value)}
                            required
                            className="w-full mt-0.5 px-2 py-1 bg-[#fafafc] border border-[#e5e5ea] rounded-[8px] text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#86868b] uppercase">To Date</label>
                          <input
                            type="date"
                            value={customToInput}
                            onChange={(e) => setCustomToInput(e.target.value)}
                            className="w-full mt-0.5 px-2 py-1 bg-[#fafafc] border border-[#e5e5ea] rounded-[8px] text-[11px]"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-[#0071e3] text-white rounded-[10px] font-bold text-[11px] shadow-xs cursor-pointer hover:bg-[#0062c4]"
                        >
                          Apply Range
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Search Input */}
              <div className="relative flex-1 sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e93]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search history..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#e5e5ea] rounded-full text-[12px] text-[#1d1d1f] placeholder-[#8e8e93] focus:outline-none focus:border-[#0071e3]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8e8e93] hover:text-[#1d1d1f]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Date Filter Chip Banner if single date is active */}
        {selectedDate && (
          <div className="flex items-center justify-between bg-[#f0f7ff] border border-[#0071e3]/30 px-4 py-2 rounded-[14px] text-[12px] text-[#0071e3]">
            <div className="flex items-center gap-2">
              <CalendarIcon size={14} />
              <span>
                Filtered by Date: <strong>{new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
              </span>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="font-bold underline cursor-pointer hover:text-[#0051a8]"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Date Range Chip Banner if date range is active */}
        {(dateRangeFrom || dateRangeTo) && !selectedDate && (
          <div className="flex items-center justify-between bg-[#f0f7ff] border border-[#0071e3]/30 px-4 py-2 rounded-[14px] text-[12px] text-[#0071e3]">
            <div className="flex items-center gap-2">
              <CalendarIcon size={14} />
              <span>
                Filtered by Date Range: <strong>{dateRangeFrom || 'Start'}</strong> to <strong>{dateRangeTo || 'Today'}</strong>
              </span>
            </div>
            <button
              onClick={() => {
                setDateRangeFrom(null);
                setDateRangeTo(null);
                setDateRangePreset('ALL');
              }}
              className="font-bold underline cursor-pointer hover:text-[#0051a8]"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Timeline Records List */}
        {groupedActivities.length === 0 ? (
          <div className="bg-white p-12 rounded-[24px] border border-[#e5e5ea] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#f2f2f7] flex items-center justify-center mx-auto text-[#8e8e93]">
              <Clock size={24} />
            </div>
            <h3 className="text-[16px] font-bold text-[#1d1d1f]">No activity recorded yet</h3>
            <p className="text-[13px] text-[#6e6e73] max-w-sm mx-auto leading-relaxed">
              {searchQuery || selectedDate || activeFilter !== 'ALL'
                ? 'No activities match your current search or date filter. Try clearing filters.'
                : 'Your verified gym check-ins, completed workout routines, and payment receipts will appear here chronologically.'}
            </p>
            {(searchQuery || selectedDate || activeFilter !== 'ALL') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setActiveFilter('ALL');
                  setSelectedDate(null);
                  setSearchQuery('');
                }}
              >
                Reset All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {groupedActivities.map(([dateKey, items]) => (
              <div key={dateKey} className="space-y-2.5">
                {/* Date Header Pill */}
                <div className="sticky top-20 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/90 backdrop-blur-md text-[#1d1d1f] border border-[#e5e5ea] shadow-2xs">
                    <CalendarIcon size={11} className="text-[#0071e3]" />
                    {formatDateHeader(dateKey)}
                  </span>
                </div>

                {/* Timeline Items for Date */}
                <div className="space-y-2 pl-2 border-l-2 border-[#e5e5ea] ml-3.5">
                  {items.map((act) => (
                    <motion.div
                      key={act.id}
                      whileHover={{ scale: 1.005 }}
                      onClick={() => handleOpenActivityDetail(act)}
                      className="bg-white p-4 rounded-[18px] border border-[#e5e5ea] hover:border-[#0071e3]/30 transition-all shadow-2xs flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 border ${getEventBg(
                            act.type
                          )}`}
                        >
                          {getEventIcon(act.type)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[14px] text-[#1d1d1f] truncate">
                              {act.title}
                            </span>
                            {act.badge && (
                              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[#f2f2f7] text-[#6e6e73]">
                                {act.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#6e6e73] truncate mt-0.5">
                            {act.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {act.type === 'PAYMENT' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewReceiptFromPayment(act.metadata);
                            }}
                            className="px-2.5 py-1 bg-[#0071e3]/10 hover:bg-[#0071e3]/20 text-[#0071e3] text-[11px] font-semibold rounded-full border border-[#0071e3]/20 transition-all flex items-center gap-1"
                          >
                            <FileText size={11} /> Receipt
                          </button>
                        )}
                        <ChevronRight
                          size={16}
                          className="text-[#8e8e93] group-hover:text-[#0071e3] transition-colors"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

            {/* Load More Pagination */}
            {hasMore && (
              <div className="pt-4 pb-2 flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-white hover:bg-[#f5f5f7] border border-[#e5e5ea] text-[#1d1d1f] text-[13px] font-semibold rounded-full shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                      <span>Loading older activity...</span>
                    </>
                  ) : (
                    <>
                      <span>Load More History</span>
                      <span className="text-[11px] font-normal text-[#86868b]">
                        (Showing {activitiesList.length} of {totalCount})
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
            {!hasMore && activitiesList.length > 0 && totalCount > 10 && (
              <div className="pt-4 pb-2 text-center text-[12px] text-[#86868b] flex items-center justify-center gap-2">
                <Check size={14} className="text-[#34c759]" />
                <span>All {totalCount} activity records loaded</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. ACTIVITY DETAIL DRAWER / SHEET */}
      <Sheet
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        title={selectedActivity?.title || 'Activity Detail'}
        subtitle={selectedActivity ? formatDateHeader(selectedActivity.date) : ''}
        maxWidth="lg"
      >
        {selectedActivity && (
          <div className="space-y-6 text-[#1d1d1f] py-2">
            {/* Header Status Card */}
            <div className={`p-4 rounded-[18px] border flex items-center gap-3 ${getEventBg(selectedActivity.type)}`}>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xs">
                {getEventIcon(selectedActivity.type)}
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#6e6e73]">
                  {selectedActivity.badge || selectedActivity.type}
                </div>
                <div className="text-[15px] font-bold text-[#1d1d1f]">
                  {selectedActivity.title}
                </div>
                <div className="text-[12px] text-[#6e6e73]">
                  {selectedActivity.subtitle}
                </div>
              </div>
            </div>

            {/* Detailed Metadata Breakdown */}
            {selectedActivity.type === 'WORKOUT' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#86868b]">Workout Status</span>
                  <span className="font-bold px-2.5 py-0.5 rounded-full bg-[#af52de]/15 text-[#af52de] text-[11px]">
                    {selectedActivity.status}
                  </span>
                </div>

                {selectedActivity.metadata?.description && (
                  <p className="text-[13px] text-[#6e6e73] leading-relaxed bg-[#fafafc] p-3 rounded-[14px] border border-[#e5e5ea]">
                    {selectedActivity.metadata.description}
                  </p>
                )}

                {/* Exercise List */}
                <div className="space-y-2">
                  <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#86868b]">
                    Exercise Routine Breakdown
                  </h4>
                  {(() => {
                    let exs: any[] = [];
                    try {
                      exs = JSON.parse(selectedActivity.metadata?.exercises || '[]');
                    } catch {
                      exs = [];
                    }

                    if (exs.length === 0) {
                      return <p className="text-[12px] text-[#86868b]">No exercises listed.</p>;
                    }

                    return (
                      <div className="space-y-2">
                        {exs.map((ex, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-[#fafafc] border border-[#e5e5ea] rounded-[14px] flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="text-[13px] font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                                {ex.completed ? (
                                  <Check size={14} className="text-[#34c759]" />
                                ) : (
                                  <Clock size={14} className="text-[#8e8e93]" />
                                )}
                                <span>{ex.name}</span>
                              </div>
                              <div className="text-[11px] text-[#6e6e73] mt-0.5">
                                Sets: <strong>{ex.sets}</strong> • Reps: <strong>{ex.reps}</strong>
                                {ex.weight && (
                                  <span> • Weight: <strong className="text-[#ff2d55]">{ex.weight}</strong></span>
                                )}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                ex.completed
                                  ? 'bg-[#34c759]/15 text-[#34c759]'
                                  : 'bg-[#8e8e93]/15 text-[#8e8e93]'
                              }`}
                            >
                              {ex.completed ? 'Finished' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {selectedActivity.metadata?.notes && (
                  <div className="p-3 bg-[#f5f5f7] border border-[#e5e5ea] rounded-[14px] text-[12px] text-[#6e6e73]">
                    <strong>Notes:</strong> {selectedActivity.metadata.notes}
                  </div>
                )}

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setSelectedActivity(null);
                    onNavigate('workouts');
                  }}
                >
                  Open Workouts Hub
                </Button>
              </div>
            )}

            {selectedActivity.type === 'PAYMENT' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[18px] space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">Receipt Number:</span>
                    <span className="font-mono font-bold text-[#1d1d1f]">
                      {selectedActivity.metadata?.receiptNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">Amount Paid:</span>
                    <span className="font-bold text-[#34c759]">
                      ₹{selectedActivity.metadata?.amount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">Payment Mode:</span>
                    <span className="font-semibold">{selectedActivity.metadata?.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">Status:</span>
                    <span className="font-bold text-[#34c759] uppercase">{selectedActivity.status}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    handleViewReceiptFromPayment(selectedActivity.metadata);
                  }}
                >
                  <FileText size={16} className="mr-1.5" />
                  View & Print Official Receipt
                </Button>
              </div>
            )}

            {selectedActivity.type === 'ATTENDANCE' && (
              <div className="space-y-3">
                <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[18px] space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">Check-in Method:</span>
                    <span className="font-semibold">
                      {selectedActivity.metadata?.checkInMethod === 'QR' ? 'Front Desk QR Terminal' : 'Self-Service Pass'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">Check-in Timestamp:</span>
                    <span className="font-semibold">
                      {new Date(selectedActivity.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">Verification:</span>
                    <span className="font-bold text-[#34c759]">Access Authorized</span>
                  </div>
                </div>
              </div>
            )}

            {selectedActivity.type === 'COMMUNITY' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[18px] space-y-3">
                  <p className="text-[14px] text-[#1d1d1f] leading-relaxed">
                    "{selectedActivity.metadata?.content}"
                  </p>
                  <div className="flex items-center gap-4 text-[12px] text-[#86868b] border-t border-[#e5e5ea] pt-2">
                    <span>❤️ {selectedActivity.metadata?.likesCount || 0} Likes</span>
                    <span>💬 {selectedActivity.metadata?.commentsCount || 0} Comments</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setSelectedActivity(null);
                    onNavigate('community');
                  }}
                >
                  Open Community Wall
                </Button>
              </div>
            )}

            {selectedActivity.type === 'ACHIEVEMENT' && (
              <div className="space-y-4">
                <div className="p-6 bg-[#fffbf0] border border-[#ff9500]/30 rounded-[20px] text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-[#ff9500] text-white flex items-center justify-center mx-auto shadow-xs">
                    <Trophy size={28} />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#1d1d1f]">
                    {selectedActivity.metadata?.title}
                  </h3>
                  <p className="text-[13px] text-[#6e6e73] leading-relaxed max-w-sm mx-auto">
                    {selectedActivity.metadata?.description}
                  </p>
                  <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#b25e00] bg-[#ff9500]/15 px-3 py-1 rounded-full border border-[#ff9500]/30">
                    {selectedActivity.metadata?.tier || 'Gold'} Tier Milestone
                  </span>
                </div>
              </div>
            )}

            {selectedActivity.type === 'MEMBERSHIP' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[18px] space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">Plan Name:</span>
                    <span className="font-bold text-[#1d1d1f]">{selectedActivity.metadata?.planName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">Valid From:</span>
                    <span className="font-semibold">{selectedActivity.metadata?.startDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">Valid Until:</span>
                    <span className="font-semibold">{selectedActivity.metadata?.endDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#86868b]">Status:</span>
                    <span className="font-bold text-[#0071e3]">{selectedActivity.metadata?.status}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setSelectedActivity(null);
                    onNavigate('membership');
                  }}
                >
                  View Membership Details
                </Button>
              </div>
            )}
          </div>
        )}
      </Sheet>

      {/* Official Receipt Modal */}
      {selectedPaymentForReceipt && (
        <MemberReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setSelectedPaymentForReceipt(null);
          }}
          payment={selectedPaymentForReceipt}
          member={linkedMember || userProfile}
        />
      )}
    </div>
  );
};
