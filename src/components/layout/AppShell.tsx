import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppIcon, AppIconName } from '../ui/AppIcon';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Sheet } from '../ui/Sheet';
import { Gym, User } from '../../types';
import { getGym, getUser, getNotifications } from '../../lib/storage';
import { useAuth } from '../../context/AuthContext.tsx';
import { springs, pageVariants } from '../../lib/motion';

export type NavView = 
  | 'dashboard'
  | 'members'
  | 'payments'
  | 'plans'
  | 'expenses'
  | 'reports'
  | 'notifications'
  | 'settings'
  | 'profile';

interface AppShellProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  onAddPaymentClick: () => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  children: React.ReactNode;
}

interface NavItemConfig {
  id: NavView;
  label: string;
  icon: AppIconName;
  restrictedFor?: ('trainer' | 'manager')[];
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  onAddPaymentClick,
  onOpenSearch,
  onOpenAuth,
  children,
}) => {
  const { role, isTrainer, userProfile, updateRole, logout } = useAuth();
  const [gym, setGym] = useState<Gym>(getGym());
  const [user, setUser] = useState<User>(getUser());
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const notifications = getNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleStorageChange = () => {
      setGym(getGym());
      setUser(getUser());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  const navItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'house' },
    { id: 'members', label: 'Members', icon: 'person.2' },
    { id: 'payments', label: 'Payments', icon: 'creditcard', restrictedFor: ['trainer'] },
    { id: 'plans', label: 'Plans', icon: 'layers' },
    { id: 'expenses', label: 'Expenses', icon: 'dollarsign', restrictedFor: ['trainer'] },
    { id: 'reports', label: 'Reports', icon: 'chart', restrictedFor: ['trainer'] },
    { id: 'notifications', label: 'Activity', icon: 'bell' },
    { id: 'settings', label: 'Settings', icon: 'gear', restrictedFor: ['trainer'] },
  ];

  const accessibleNavItems = navItems.filter((item) => {
    if (isTrainer && item.restrictedFor?.includes('trainer')) return false;
    return true;
  });

  const handleNavClick = (view: NavView) => {
    onNavigate(view);
    setMoreSheetOpen(false);
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Overview';
      case 'members':
        return 'Members';
      case 'payments':
        return 'Payments & Billing';
      case 'plans':
        return 'Membership Plans';
      case 'expenses':
        return 'Expenses';
      case 'reports':
        return 'Financial Reports';
      case 'notifications':
        return 'Activity & Audit';
      case 'settings':
        return 'Settings';
      case 'profile':
        return 'Facility Profile';
      default:
        return 'Gym Manager';
    }
  };

  // Primary 4 tabs for mobile bottom bar
  const mobilePrimaryTabs: { id: NavView; label: string; icon: AppIconName }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'house' },
    { id: 'members', label: 'Members', icon: 'person.2' },
    isTrainer
      ? { id: 'plans', label: 'Plans', icon: 'layers' }
      : { id: 'payments', label: 'Payments', icon: 'creditcard' },
    isTrainer
      ? { id: 'notifications', label: 'Activity', icon: 'bell' }
      : { id: 'reports', label: 'Reports', icon: 'chart' },
  ];

  return (
    <div className="bg-[#f5f5f7] text-[#1d1d1f] w-full min-h-screen flex flex-col lg:flex-row selection:bg-[#0071e3] selection:text-white pb-28 lg:pb-0">
      {/* ========================================================================= */}
      {/* 1. DESKTOP / iPadOS FLOATING TRANSLUCENT NAVIGATION SIDEBAR RAIL */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-[250px] shrink-0 sticky top-4 left-4 h-[calc(100vh-32px)] my-4 ml-4 z-40">
        <div className="flex-1 bg-white/75 backdrop-blur-[24px] -webkit-backdrop-blur-[24px] border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-[24px] p-4 flex flex-col justify-between overflow-hidden">
          {/* Top Brand / Gym Identity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-[#f0f0f2]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[10px] bg-[#0071e3] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AppIcon name="dumbbell" size={17} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[#1d1d1f] text-[14px] tracking-tight truncate">
                    {gym.name || 'Commercial Gym'}
                  </div>
                  <div className="text-[11px] text-[#8e8e93] tracking-tight truncate capitalize">
                    {role} • iOS Edition
                  </div>
                </div>
              </div>
            </div>

            {/* Spotlight Quick Search Button */}
            <button
              onClick={onOpenSearch}
              className="w-full px-3 py-2 bg-[#f2f2f7]/80 hover:bg-[#eaeaee] text-[#8e8e93] hover:text-[#1d1d1f] rounded-[12px] text-[13px] flex items-center justify-between transition-colors cursor-pointer group"
              title="Spotlight Search (Cmd+K)"
            >
              <div className="flex items-center gap-2">
                <AppIcon name="magnifyingglass" size={14} className="text-[#8e8e93] group-hover:text-[#1d1d1f]" />
                <span className="font-normal">Spotlight...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-[#8e8e93] bg-white rounded-[6px] shadow-2xs border border-[#e5e5ea]">
                ⌘K
              </kbd>
            </button>

            {/* Navigation List Items */}
            <nav className="space-y-1 pt-1">
              {accessibleNavItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`relative w-full px-3.5 py-2.5 rounded-[12px] text-[14px] font-medium tracking-tight flex items-center justify-between transition-all duration-150 cursor-pointer select-none ${
                      isActive
                        ? 'bg-[#0071e3]/10 text-[#0071e3]'
                        : 'text-[#1d1d1f] hover:bg-[#f2f2f7]/80 active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <AppIcon
                        name={item.icon}
                        size={18}
                        strokeWidth={isActive ? 2.3 : 1.9}
                        className={isActive ? 'text-[#0071e3]' : 'text-[#8e8e93]'}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-[#0071e3] text-white text-[10px] font-semibold rounded-full shadow-2xs">
                        {unreadCount}
                      </span>
                    )}

                    {isActive && (
                      <motion.div
                        layoutId="active-indicator-rail"
                        transition={springs.snappy}
                        className="w-1.5 h-1.5 rounded-full bg-[#0071e3]"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Profile & Role Switcher */}
          <div className="pt-3 border-t border-[#f0f0f2] space-y-2">
            <button
              onClick={() => onNavigate('profile')}
              className={`w-full p-2 rounded-[12px] flex items-center justify-between transition-colors text-left cursor-pointer ${
                currentView === 'profile' ? 'bg-[#0071e3]/10' : 'hover:bg-[#f2f2f7]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#0071e3]/12 text-[#0071e3] flex items-center justify-center font-semibold text-[13px] shrink-0">
                  {(userProfile?.name || user.name || 'O').charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[#1d1d1f] truncate">
                    {userProfile?.name || user.name}
                  </div>
                  <div className="text-[11px] text-[#8e8e93] truncate">
                    {userProfile?.email || user.email}
                  </div>
                </div>
              </div>
              <AppIcon name="chevron.right" size={14} className="text-[#c7c7cc]" />
            </button>

            {import.meta.env.DEV && (
              <button
                onClick={() => updateRole('member')}
                className="w-full py-1.5 px-2 bg-[#fbf5fd] hover:bg-[#f5e8fc] text-[#af52de] rounded-[10px] text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-[#af52de]/20 mb-2"
                title="Switch to Member App View (Dev Only)"
              >
                <span>📱 Open Member App (Dev)</span>
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenAuth}
                className="flex-1 py-1.5 px-2 bg-[#f2f2f7] hover:bg-[#eaeaee] text-[#1d1d1f] rounded-[10px] text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title="Switch Roles & Access"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
                <span className="capitalize">{role}</span>
              </button>

              <button
                onClick={() => setIsLogoutConfirmOpen(true)}
                className="w-8 h-8 rounded-[10px] bg-[#f2f2f7] hover:bg-[#ffe5e5] text-[#8e8e93] hover:text-[#ff3b30] flex items-center justify-center cursor-pointer transition-colors"
                title="Sign Out"
              >
                <AppIcon name="logout" size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN APP CANVAS WITH STICKY FROSTED HEADER */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Frosted iOS / iPadOS Top Bar */}
        <header className="sticky top-0 z-30 bg-[#f5f5f7]/80 backdrop-blur-[24px] -webkit-backdrop-blur-[24px] border-b border-[#e5e5ea] px-4 sm:px-8 py-3 transition-colors">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile Gym Icon */}
              <div className="lg:hidden w-8 h-8 rounded-[10px] bg-[#0071e3] text-white flex items-center justify-center shrink-0 shadow-xs">
                <AppIcon name="dumbbell" size={16} strokeWidth={2.2} />
              </div>
              <div>
                <h1 className="text-[20px] sm:text-[24px] font-bold text-[#1d1d1f] tracking-tight leading-tight">
                  {getViewTitle()}
                </h1>
                <div className="text-[11px] text-[#8e8e93] font-medium tracking-tight">
                  {gym.name}
                </div>
              </div>
            </div>

            {/* Contextual Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Spotlight search icon button on mobile */}
              <button
                onClick={onOpenSearch}
                className="lg:hidden w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-[#e5e5ea] text-[#1d1d1f] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                aria-label="Search"
              >
                <AppIcon name="magnifyingglass" size={16} />
              </button>

              {!isTrainer && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={onAddPaymentClick}
                  className="gap-1.5 shadow-sm text-[13px] sm:text-[14px]"
                >
                  <AppIcon name="plus" size={15} strokeWidth={2.4} />
                  <span>Collect Payment</span>
                </Button>
              )}

              <button
                onClick={() => onNavigate('notifications')}
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white border border-[#e5e5ea] text-[#1d1d1f] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Activity & Notifications"
              >
                <AppIcon name="bell" size={16} strokeWidth={2} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#0071e3] ring-2 ring-white" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Content Area with Fluid Page Transition */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="min-w-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE NATIVE iOS FLOATING BOTTOM TAB BAR (Frosted Glass, 72px) */}
      {/* ========================================================================= */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-3 left-3 right-3 z-40 h-[70px] bg-[#fafafc]/82 backdrop-blur-[24px] -webkit-backdrop-blur-[24px] border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[26px] px-2 flex items-center justify-around select-none"
      >
        {mobilePrimaryTabs.map((tab) => {
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleNavClick(tab.id)}
              className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center gap-1 transition-all duration-150 cursor-pointer active:scale-95 ${
                isActive ? 'text-[#0071e3]' : 'text-[#8e8e93] hover:text-[#1d1d1f]'
              }`}
            >
              <div className="relative">
                <AppIcon
                  name={tab.icon}
                  size={21}
                  strokeWidth={isActive ? 2.4 : 1.9}
                  className={isActive ? 'text-[#0071e3]' : 'text-[#8e8e93]'}
                />
                {tab.id === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0071e3]" />
                )}
              </div>
              <span className={`text-[10.5px] tracking-tight ${isActive ? 'font-semibold' : 'font-normal'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* 5th Tab: "More" ActionSheet Button */}
        <button
          onClick={() => setMoreSheetOpen(true)}
          className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center gap-1 transition-all duration-150 cursor-pointer active:scale-95 ${
            moreSheetOpen ? 'text-[#0071e3]' : 'text-[#8e8e93] hover:text-[#1d1d1f]'
          }`}
        >
          <AppIcon name="ellipsis" size={21} strokeWidth={2} />
          <span className="text-[10.5px] font-normal tracking-tight">More</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* 4. MOBILE "MORE" iOS BOTTOM SHEET */}
      {/* ========================================================================= */}
      <Sheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="More Services & Settings"
        subtitle={`${gym.name || 'Commercial Gym'} • ${role.toUpperCase()}`}
        maxWidth="md"
      >
        <div className="space-y-4 pb-2">
          {/* User Profile Card */}
          <div
            onClick={() => handleNavClick('profile')}
            className="p-3.5 bg-[#f2f2f7] hover:bg-[#eaeaee] rounded-[16px] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0071e3] text-white flex items-center justify-center font-semibold text-[15px]">
                {(userProfile?.name || user.name || 'O').charAt(0)}
              </div>
              <div>
                <div className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">
                  {userProfile?.name || user.name}
                </div>
                <div className="text-[12px] text-[#8e8e93] tracking-tight">
                  {userProfile?.email || user.email}
                </div>
              </div>
            </div>
            <AppIcon name="chevron.right" size={16} className="text-[#c7c7cc]" />
          </div>

          {/* Secondary Views Navigation Links */}
          <div className="bg-[#ffffff] border border-[#e5e5ea] rounded-[18px] divide-y divide-[#f0f0f0] overflow-hidden">
            <button
              onClick={() => handleNavClick('plans')}
              className="w-full px-4 py-3 min-h-[50px] flex items-center justify-between text-left hover:bg-[#f9f9fb] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[9px] bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
                  <AppIcon name="layers" size={17} />
                </div>
                <span className="text-[15px] font-normal text-[#1d1d1f]">Membership Plans</span>
              </div>
              <AppIcon name="chevron.right" size={14} className="text-[#c7c7cc]" />
            </button>

            {!isTrainer && (
              <button
                onClick={() => handleNavClick('expenses')}
                className="w-full px-4 py-3 min-h-[50px] flex items-center justify-between text-left hover:bg-[#f9f9fb] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[9px] bg-[#ff9500]/10 text-[#ff9500] flex items-center justify-center">
                    <AppIcon name="dollarsign" size={17} />
                  </div>
                  <span className="text-[15px] font-normal text-[#1d1d1f]">Facility Expenses</span>
                </div>
                <AppIcon name="chevron.right" size={14} className="text-[#c7c7cc]" />
              </button>
            )}

            <button
              onClick={() => handleNavClick('notifications')}
              className="w-full px-4 py-3 min-h-[50px] flex items-center justify-between text-left hover:bg-[#f9f9fb] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[9px] bg-[#34c759]/10 text-[#34c759] flex items-center justify-center">
                  <AppIcon name="bell" size={17} />
                </div>
                <span className="text-[15px] font-normal text-[#1d1d1f]">Activity & Audit Log</span>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-[#0071e3] text-white text-[11px] font-semibold rounded-full">
                    {unreadCount}
                  </span>
                )}
                <AppIcon name="chevron.right" size={14} className="text-[#c7c7cc]" />
              </div>
            </button>

            {!isTrainer && (
              <button
                onClick={() => handleNavClick('settings')}
                className="w-full px-4 py-3 min-h-[50px] flex items-center justify-between text-left hover:bg-[#f9f9fb] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[9px] bg-[#8e8e93]/15 text-[#636366] flex items-center justify-center">
                    <AppIcon name="gear" size={17} />
                  </div>
                  <span className="text-[15px] font-normal text-[#1d1d1f]">Settings & System</span>
                </div>
                <AppIcon name="chevron.right" size={14} className="text-[#c7c7cc]" />
              </button>
            )}
          </div>

          {/* Quick Actions & Role Switch */}
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setMoreSheetOpen(false);
                onOpenAuth();
              }}
              className="w-full justify-center"
            >
              <span className="w-2 h-2 rounded-full bg-[#34c759] mr-1.5" />
              Role: {role.toUpperCase()}
            </Button>

            <Button
              variant="destructive"
              size="md"
              onClick={() => {
                setMoreSheetOpen(false);
                setIsLogoutConfirmOpen(true);
              }}
              className="w-full justify-center"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Sign Out Confirmation Sheet */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        title="Sign Out of Session"
        message="Are you sure you want to sign out? Your gym data and settings remain securely stored in the cloud database."
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        isDestructive={true}
        onConfirm={async () => {
          setIsLogoutConfirmOpen(false);
          await logout();
        }}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </div>
  );
};
