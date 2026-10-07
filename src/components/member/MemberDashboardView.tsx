import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { 
  CheckCircle2, 
  Flame, 
  Calendar, 
  CreditCard, 
  Dumbbell, 
  Users, 
  QrCode, 
  Sparkles, 
  Clock, 
  AlertCircle,
  ChevronRight,
  TrendingUp,
  MapPin,
  Phone,
  ShieldCheck,
  Award,
  Key
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';
import { MemberNavTab } from './MemberShell';

interface MemberDashboardViewProps {
  onNavigate: (tab: MemberNavTab) => void;
  onOpenQR: () => void;
}

export const MemberDashboardView: React.FC<MemberDashboardViewProps> = ({ onNavigate, onOpenQR }) => {
  const { userProfile, gym } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getMemberDashboard();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load member dashboard', err);
      showToast(err.message || 'Failed to load member dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCheckIn = async () => {
    try {
      setIsCheckingIn(true);
      const res = await api.memberCheckIn({ checkInMethod: 'SELF' });
      if (res.alreadyCheckedIn) {
        showToast(res.message || 'Already checked in today!', 'info');
      } else {
        showToast('🎉 Check-in recorded! Enjoy your workout session.', 'success');
      }
      await fetchDashboard();
    } catch (err: any) {
      showToast(err.message || 'Check-in failed. Please try again.', 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Greeting time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#86868b] font-medium">Loading your member hub...</p>
      </div>
    );
  }

  if (!loading && !data) {
    return (
      <div className="bg-white p-8 rounded-[24px] border border-[#e5e5ea] text-center max-w-md mx-auto my-12 space-y-4 shadow-xs">
        <div className="w-14 h-14 bg-[#f2f2f7] rounded-full flex items-center justify-center mx-auto text-[#0071e3]">
          <Key size={26} />
        </div>
        <h2 className="text-[18px] font-bold text-[#1d1d1f]">Member Profile Not Linked</h2>
        <p className="text-[13px] text-[#6e6e73] leading-relaxed">
          Your authenticated account is not yet connected to a gym member record. If you have an invitation code from the gym desk, you can link it now.
        </p>
        <div className="pt-2 flex flex-col gap-2">
          <Button variant="primary" onClick={() => onNavigate('profile')}>
            Claim Invitation Code
          </Button>
          <Button variant="secondary" onClick={() => fetchDashboard()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const member = data?.member;
  const membership = data?.membership;
  const attendance = data?.attendance;
  const todayWorkout = data?.todayWorkout;
  const announcements = data?.announcements || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Welcome & Pass Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs">
        <div>
          <div className="text-[12px] font-semibold text-[#86868b] tracking-wider uppercase mb-1">
            {gym?.name || 'Raw Power Gym'} • Member ID: {member?.memberCode || 'GM-001'}
          </div>
          <h1 className="text-[26px] font-bold text-[#1d1d1f] tracking-tight">
            {getGreeting()}, {member?.name?.split(' ')[0] || userProfile?.name?.split(' ')[0] || 'Athlete'} 👋
          </h1>
          <p className="text-[13px] text-[#6e6e73] mt-0.5">
            Ready to hit your fitness goals today?
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('activity')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] rounded-full text-[13px] font-semibold transition-all border border-[#d2d2d7] cursor-pointer"
            title="View Full Activity & History"
          >
            <Clock size={15} className="text-[#0071e3]" />
            <span>Activity</span>
          </button>
          <button
            onClick={onOpenQR}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#1d1d1f] hover:bg-[#2c2c2e] text-white rounded-full text-[13px] font-semibold transition-all cursor-pointer shadow-xs"
            title="Digital Front-Desk Pass"
          >
            <QrCode size={15} />
            <span>Digital Pass</span>
          </button>
        </div>
      </div>

      {/* Hero Attendance & Daily Check-in Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Check-In Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-[#1d1d1f] to-[#2c2c2e] text-white p-6 rounded-[24px] shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between z-10">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-white/10 text-white/90 backdrop-blur-md mb-2">
                <Clock size={12} /> TODAY'S SESSION
              </span>
              <h2 className="text-[20px] font-bold tracking-tight">
                {attendance?.checkedInToday ? "You're Checked In Today!" : "Ready to Train?"}
              </h2>
              <p className="text-[13px] text-white/70 max-w-sm mt-1">
                {attendance?.checkedInToday
                  ? `Recorded at ${new Date(attendance.lastCheckinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Keep up the high energy!`
                  : "Tap to record your session check-in and build your workout streak."}
              </p>
            </div>

            <div className="flex flex-col items-center bg-white/10 border border-white/15 px-3 py-2 rounded-[16px] backdrop-blur-md">
              <div className="flex items-center gap-1 text-[#ff9f0a] font-bold text-[18px]">
                <Flame size={20} className="fill-[#ff9f0a]" />
                <span>{attendance?.streak || 0}</span>
              </div>
              <span className="text-[10px] text-white/70 font-medium">DAY STREAK</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-4 text-[12px] text-white/80">
              <div>
                <span className="text-white font-semibold text-[14px]">{attendance?.thisMonthCheckins || 0}</span>
                <span className="ml-1 text-white/60">Sessions this month</span>
              </div>
              <div className="h-3 w-px bg-white/20" />
              <div>
                <span className="text-white font-semibold text-[14px]">{attendance?.totalCount || attendance?.totalCheckins || 0}</span>
                <span className="ml-1 text-white/60">All-time</span>
              </div>
            </div>

            {attendance?.checkedInToday ? (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#34c759] text-white rounded-full text-[13px] font-semibold shadow-xs">
                <CheckCircle2 size={16} />
                <span>Check-in Verified</span>
              </div>
            ) : (
              <button
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="px-6 py-2.5 bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] active:scale-[0.98] rounded-full text-[13px] font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isCheckingIn ? (
                  <div className="w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 size={16} className="text-[#34c759]" />
                )}
                <span>Check-In Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Membership Status Card */}
        <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#86868b] tracking-wider uppercase">
                MEMBERSHIP STATUS
              </span>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                membership?.isExpired 
                  ? 'bg-[#fff2f2] text-[#ff3b30] border-[#ff3b30]/30'
                  : 'bg-[#f4fcf6] text-[#34c759] border-[#34c759]/30'
              }`}>
                {membership?.isExpired ? 'EXPIRED' : (membership?.status || 'ACTIVE')}
              </span>
            </div>

            <h3 className="text-[17px] font-bold text-[#1d1d1f] leading-snug">
              {membership?.planName || 'General Fitness Membership'}
            </h3>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">
                {membership?.daysRemaining || 0}
              </span>
              <span className="text-[13px] text-[#86868b] font-medium">days remaining</span>
            </div>

            {membership && (
              <div className="mt-3 text-[12px] text-[#6e6e73] space-y-1">
                <div className="flex justify-between">
                  <span>Valid until:</span>
                  <span className="font-semibold text-[#1d1d1f]">
                    {new Date(membership.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                {membership.pendingDues > 0 && (
                  <div className="flex justify-between text-[#ff3b30] font-medium pt-1">
                    <span>Pending balance:</span>
                    <span>₹{membership.pendingDues.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('membership')}
            className="mt-4 w-full py-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#0071e3] font-semibold text-[12px] rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>View Plan & Invoices</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Grid: Workout of the Day & Community Announcements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Workout Routine Card */}
        <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#f0f4ff] flex items-center justify-center text-[#0071e3]">
                  <Dumbbell size={16} />
                </div>
                <span className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
                  TODAY'S WORKOUT ROUTINE
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#0071e3] bg-[#f0f4ff] px-2.5 py-0.5 rounded-full">
                {todayWorkout?.status || 'ASSIGNED'}
              </span>
            </div>

            <h3 className="text-[17px] font-bold text-[#1d1d1f]">
              {todayWorkout?.title || 'Full Body Strength & Core'}
            </h3>
            <p className="text-[13px] text-[#6e6e73] mt-1 line-clamp-2">
              {todayWorkout?.description || 'Customized strength training and core stability routine designed for conditioning.'}
            </p>

            {todayWorkout?.exercises && (
              <div className="mt-4 p-3 bg-[#fafafc] border border-[#f0f0f2] rounded-[16px] space-y-2">
                <div className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
                  Highlights
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    try {
                      const exs = JSON.parse(todayWorkout.exercises);
                      return exs.slice(0, 3).map((ex: any, idx: number) => (
                        <span key={idx} className="text-[11px] font-medium bg-white border border-[#e5e5ea] px-2.5 py-1 rounded-full text-[#1d1d1f]">
                          {ex.name} • {ex.sets} sets
                        </span>
                      ));
                    } catch {
                      return <span className="text-[12px] text-[#86868b]">Workout exercises available</span>;
                    }
                  })()}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('workouts')}
            className="mt-5 w-full py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-[13px] rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Dumbbell size={15} />
            <span>Open Exercise Checklist</span>
          </button>
        </div>

        {/* Community Announcements Card */}
        <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#fff8eb] flex items-center justify-center text-[#ff9500]">
                  <Users size={16} />
                </div>
                <span className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
                  COMMUNITY & ANNOUNCEMENTS
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#ff9500] bg-[#fff8eb] px-2.5 py-0.5 rounded-full">
                Live Feed
              </span>
            </div>

            {announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.slice(0, 2).map((ann: any) => (
                  <div key={ann.id} className="p-3.5 bg-[#fafafc] border border-[#f0f0f2] rounded-[16px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-[#0071e3] bg-[#f0f4ff] px-2 py-0.5 rounded-full">
                        {ann.authorRole}
                      </span>
                      <span className="text-[11px] text-[#86868b]">
                        {new Date(ann.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#1d1d1f] font-medium line-clamp-2">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-[#86868b] text-[13px]">
                No announcements right now. Join the member community wall to share workouts!
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('community')}
            className="mt-5 w-full py-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] font-semibold text-[13px] rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[#d2d2d7]"
          >
            <Users size={15} className="text-[#0071e3]" />
            <span>Join Member Community Wall</span>
          </button>
        </div>
      </div>

      {/* Gym Contact & Facilities Footer Strip */}
      <div className="bg-[#fafafc] p-4 rounded-[20px] border border-[#e5e5ea] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-[#6e6e73]">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-[#86868b] shrink-0" />
          <span>{gym?.address || 'Official Training Facility'}</span>
        </div>
        {gym?.phone && (
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-[#86868b] shrink-0" />
            <span>Support: {gym.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
};
