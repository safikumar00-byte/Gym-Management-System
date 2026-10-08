import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { 
  Home, 
  Users, 
  Dumbbell, 
  CreditCard, 
  User, 
  QrCode, 
  LogOut, 
  Sparkles,
  ArrowRightLeft,
  ShieldCheck,
  Flame,
  RotateCcw,
  Clock
} from 'lucide-react';
import { MemberDashboardView } from './MemberDashboardView';
import { MemberActivityView } from './MemberActivityView';
import { MemberCommunityView } from './MemberCommunityView';
import { MemberWorkoutsView } from './MemberWorkoutsView';
import { MemberMembershipView } from './MemberMembershipView';
import { MemberProfileView } from './MemberProfileView';
import { Modal } from '../ui/Modal';

export type MemberNavTab = 'dashboard' | 'activity' | 'workouts' | 'community' | 'membership' | 'profile';

interface MemberShellProps {
  onOpenAuth: () => void;
  onSwitchToStaff?: () => void;
}

export const MemberShell: React.FC<MemberShellProps> = ({ onOpenAuth, onSwitchToStaff }) => {
  const { gym, userProfile, updateRole, logout, linkedMember } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<MemberNavTab>('dashboard');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as MemberNavTab, label: 'Dashboard', icon: Home },
    { id: 'activity' as MemberNavTab, label: 'Activity', icon: Clock },
    { id: 'workouts' as MemberNavTab, label: 'Workouts', icon: Dumbbell },
    { id: 'community' as MemberNavTab, label: 'Community', icon: Users },
    { id: 'membership' as MemberNavTab, label: 'Membership', icon: CreditCard },
    { id: 'profile' as MemberNavTab, label: 'Pass & Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col font-sans antialiased selection:bg-[#0071e3]/20">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#e5e5ea]/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand & Gym Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[#1d1d1f] flex items-center justify-center text-white shadow-xs">
              <Dumbbell size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[15px] text-[#1d1d1f] tracking-tight">
                  {gym?.name || 'My Fitness Gym'}
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#af52de]/10 text-[#af52de] border border-[#af52de]/20">
                  Member App
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-full border border-[#e5e5ea]">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#1d1d1f] shadow-xs font-semibold'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-[#0071e3]' : ''} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsQRModalOpen(true)}
              className="p-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] rounded-full transition-all border border-[#e5e5ea] cursor-pointer"
              title="Show QR Check-in Pass"
            >
              <QrCode size={17} />
            </button>

            {/* Quick Switch to Staff / Owner for Admin Testing in Development only */}
            {import.meta.env.DEV && (
              <button
                onClick={() => updateRole('owner')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f4ff] hover:bg-[#e1ecff] text-[#0071e3] text-[12px] font-semibold rounded-full border border-[#0071e3]/20 transition-all cursor-pointer"
                title="Switch to Staff/Owner view (Dev only)"
              >
                <ArrowRightLeft size={13} />
                <span>Staff View</span>
              </button>
            )}

            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 pl-2 pr-3 py-1 bg-white hover:bg-[#f5f5f7] border border-[#e5e5ea] rounded-full transition-all cursor-pointer shadow-xs"
            >
              <div className="w-6 h-6 rounded-full bg-[#af52de] text-white flex items-center justify-center font-bold text-[11px]">
                {(userProfile?.name || 'M').charAt(0)}
              </div>
              <span className="text-[12px] font-semibold text-[#1d1d1f] hidden sm:inline">
                {userProfile?.name?.split(' ')[0] || 'Member'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 pb-28 md:pb-12">
        {activeTab === 'dashboard' && (
          <MemberDashboardView
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenQR={() => setIsQRModalOpen(true)}
          />
        )}
        {activeTab === 'activity' && (
          <MemberActivityView
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'community' && <MemberCommunityView />}
        {activeTab === 'workouts' && <MemberWorkoutsView />}
        {activeTab === 'membership' && <MemberMembershipView />}
        {activeTab === 'profile' && <MemberProfileView />}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#e5e5ea] px-2 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-full text-[10px] font-medium transition-all ${
                isActive ? 'text-[#0071e3] font-bold' : 'text-[#86868b]'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick QR Pass Modal */}
      <Modal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        title="Digital Front-Desk Pass"
        subtitle="Scan at gym terminal or show to receptionist"
        maxWidth="sm"
      >
        <div className="flex flex-col items-center text-center p-4 space-y-4">
          <div className="p-4 bg-white border border-[#e5e5ea] rounded-[24px] shadow-sm flex flex-col items-center">
            <QrCode size={160} className="text-[#1d1d1f]" />
            <span className="font-mono text-[13px] font-bold tracking-widest text-[#1d1d1f] mt-2">
              {linkedMember?.memberCode || userProfile?.name?.toUpperCase() || 'MEMBER PASS'}
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-[16px] text-[#1d1d1f]">{userProfile?.name}</h3>
            <p className="text-[12px] text-[#6e6e73]">{gym?.name || 'Raw Power Gym'}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#34c759] font-medium bg-[#f4fcf6] px-3 py-1 rounded-full border border-[#34c759]/30">
            <ShieldCheck size={14} /> Active Facility Access
          </span>
        </div>
      </Modal>
    </div>
  );
};
