import React, { useState, useEffect } from 'react';
import { useAuth, AppRole } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';
import { 
  User, 
  Crown, 
  Briefcase, 
  UserCheck2, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Lock, 
  Smartphone, 
  Mail, 
  Save, 
  Key, 
  ShieldCheck, 
  ArrowRight, 
  Building2, 
  Sparkles,
  Layers
} from 'lucide-react';

interface ProfileViewProps {
  onNavigate?: (view: any) => void;
  onOpenAuthModal?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate, onOpenAuthModal }) => {
  const { 
    userProfile, 
    gym, 
    role, 
    verification, 
    logout, 
    updateRole, 
    updateProfileDetails,
    canManagePayments,
    canManageExpenses,
    canRefund,
    canDeleteMember,
    canExportBackup,
    canEditGymSettings,
    setAuthScreen
  } = useAuth();

  const { showToast } = useToast();

  // Form state
  const [name, setName] = useState(userProfile?.name || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [alternatePhone, setAlternatePhone] = useState(userProfile?.alternatePhone || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setEmail(userProfile.email || '');
      setPhone(userProfile.phone || '');
      setAlternatePhone(userProfile.alternatePhone || '');
      setBio(userProfile.bio || '');
    }
  }, [userProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    try {
      setIsSaving(true);
      await updateProfileDetails({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim(),
        bio: bio.trim(),
      });
      showToast('Profile updated successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleSwitch = async (newRole: AppRole) => {
    if (newRole === role) return;
    try {
      await updateRole(newRole);
      showToast(`Permission level changed to ${newRole.toUpperCase()}`);
    } catch {
      showToast('Failed to change role', 'error');
    }
  };

  const handleConfirmLogout = async () => {
    setIsLogoutConfirmOpen(false);
    try {
      await logout();
      showToast('You have been signed out.');
    } catch {
      showToast('Error during logout', 'error');
    }
  };

  const roleColors = {
    owner: {
      text: 'text-[#0066cc]',
      badge: 'border-[#0066cc]/30 text-[#0066cc] bg-[#0066cc]/10',
      icon: Crown,
      label: 'Owner (Superadmin)',
      desc: 'Full financial authority, refunds, ledger management, member deletion & cloud backups.',
    },
    manager: {
      text: 'text-[#ff9500]',
      badge: 'border-[#ff9500]/30 text-[#ff9500] bg-[#ff9500]/10',
      icon: Briefcase,
      label: 'Manager (Operations)',
      desc: 'Front desk operations, fee collection, member enrollments, plans & expense bookkeeping.',
    },
    trainer: {
      text: 'text-[#34c759]',
      badge: 'border-[#34c759]/30 text-[#34c759] bg-[#34c759]/10',
      icon: UserCheck2,
      label: 'Trainer (Coach)',
      desc: 'Member roster viewing, training assignments, attendance tracking. Financial ledger hidden.',
    },
  };

  const currentRoleMeta = roleColors[role] || roleColors.owner;
  const inputClass = "w-full px-3.5 py-2.5 bg-[#f5f5f7] border border-[#e0e0e0] rounded-[10px] text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] transition-all";
  const labelClass = "text-[12px] font-medium text-[#1d1d1f] mb-1 block";

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[26px] sm:text-[30px] font-semibold text-[#1d1d1f] tracking-tight">
            Account & Profile
          </h2>
          <p className="text-[13px] text-[#86868b] mt-0.5">
            Operator identity, credentials, and role permission settings
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenAuthModal && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenAuthModal}
              className="gap-1.5 text-[12px]"
            >
              <Key size={13} />
              <span>Auth Methods</span>
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="gap-1.5 text-[12px] text-[#ff3b30] hover:bg-[#ffe5e5] border-[#ff3b30]/30"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Identity Card */}
      <div className="p-6 bg-white border border-[#e0e0e0] rounded-[18px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#f5f5f7] border border-[#e0e0e0] flex items-center justify-center font-semibold text-2xl text-[#0066cc] shrink-0">
              {(userProfile?.name || 'O').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-xl font-semibold text-[#1d1d1f]">
                  {userProfile?.name || 'Gym Admin'}
                </h3>
                <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${currentRoleMeta.badge}`}>
                  {currentRoleMeta.label}
                </span>
              </div>

              <div className="text-[13px] text-[#86868b] flex flex-wrap items-center gap-y-1 gap-x-4">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-[#86868b]" />
                  {userProfile?.email || 'admin@gym.com'}
                </span>
                {userProfile?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Smartphone size={13} className="text-[#86868b]" />
                    {userProfile.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[#86868b]">
                  <Building2 size={13} />
                  {gym?.name || 'Iron Core Fitness'}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {verification.isVerified ? (
              <div className="px-3 py-1.5 bg-[#eefcf2] border border-[#b9eec9] rounded-full flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#34c759] shrink-0" />
                <span className="text-[12px] font-medium text-[#34c759]">
                  {verification.method === 'google' 
                    ? 'Google OAuth Verified' 
                    : verification.method === 'phone'
                    ? 'Phone OTP Verified'
                    : 'Email Verified'}
                </span>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-[#fff9f2] border border-[#ffe0b2] rounded-full flex items-center gap-2">
                <AlertCircle size={14} className="text-[#ff9500] shrink-0" />
                <span className="text-[12px] font-medium text-[#ff9500]">
                  Verification Pending
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Credentials form & Role matrix */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveProfile} className="p-6 bg-white border border-[#e0e0e0] rounded-[18px] space-y-4">
            <div className="border-b border-[#f0f0f0] pb-3">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
                Operator Details & Contact
              </h3>
              <p className="text-[12px] text-[#86868b]">
                Display name, phone number, and trainer credentials
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Emergency / Secondary Contact</label>
                <input
                  type="text"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  placeholder="Optional alternate phone number"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Bio & Certifications</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Certified strength coach, nutrition advisor, operational shift timing"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSaving}
                className="gap-2"
              >
                <Save size={15} />
                <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
              </Button>
            </div>
          </form>

          {/* Role matrix */}
          <div className="p-6 bg-white border border-[#e0e0e0] rounded-[18px] space-y-4">
            <div className="border-b border-[#f0f0f0] pb-3">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
                Role & Permissions Matrix
              </h3>
              <p className="text-[12px] text-[#86868b]">
                Current tier: <span className="font-semibold text-[#1d1d1f]">{currentRoleMeta.label}</span>. Switch roles below to simulate team member access.
              </p>
            </div>

            {/* Role switch cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['owner', 'manager', 'trainer'] as AppRole[]).map((r) => {
                const meta = roleColors[r];
                const Icon = meta.icon;
                const isCurrent = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleSwitch(r)}
                    className={`p-4 rounded-[14px] border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isCurrent
                        ? 'border-[#0071e3] bg-[#f5f9ff] shadow-sm'
                        : 'border-[#e0e0e0] bg-[#fafafc] hover:border-[#b0b0b5]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Icon size={16} className={isCurrent ? 'text-[#0071e3]' : 'text-[#86868b]'} />
                        {isCurrent && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#0071e3] text-white rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-[13px] text-[#1d1d1f] capitalize">
                        {r}
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-1 leading-snug">
                        {meta.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Capability Verifications */}
            <div className="pt-2 border-t border-[#f0f0f0] space-y-2">
              <div className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2">
                Active Privileges
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                <div className={`p-2.5 rounded-[10px] border flex items-center gap-2 ${
                  canManagePayments 
                    ? 'border-[#b9eec9] bg-[#eefcf2] text-[#1d1d1f]' 
                    : 'border-[#e0e0e0] bg-[#f5f5f7] text-[#86868b] line-through'
                }`}>
                  <CheckCircle2 size={14} className={canManagePayments ? 'text-[#34c759]' : 'text-[#86868b]'} />
                  <span>Fee Collection & Tax Receipts</span>
                </div>

                <div className={`p-2.5 rounded-[10px] border flex items-center gap-2 ${
                  canRefund 
                    ? 'border-[#b9eec9] bg-[#eefcf2] text-[#1d1d1f]' 
                    : 'border-[#e0e0e0] bg-[#f5f5f7] text-[#86868b] line-through'
                }`}>
                  <CheckCircle2 size={14} className={canRefund ? 'text-[#34c759]' : 'text-[#86868b]'} />
                  <span>Execute Payment Refunds (Owner)</span>
                </div>

                <div className={`p-2.5 rounded-[10px] border flex items-center gap-2 ${
                  canManageExpenses 
                    ? 'border-[#b9eec9] bg-[#eefcf2] text-[#1d1d1f]' 
                    : 'border-[#e0e0e0] bg-[#f5f5f7] text-[#86868b] line-through'
                }`}>
                  <CheckCircle2 size={14} className={canManageExpenses ? 'text-[#34c759]' : 'text-[#86868b]'} />
                  <span>Record Gym Overhead & Expenses</span>
                </div>

                <div className={`p-2.5 rounded-[10px] border flex items-center gap-2 ${
                  canDeleteMember 
                    ? 'border-[#b9eec9] bg-[#eefcf2] text-[#1d1d1f]' 
                    : 'border-[#e0e0e0] bg-[#f5f5f7] text-[#86868b] line-through'
                }`}>
                  <CheckCircle2 size={14} className={canDeleteMember ? 'text-[#34c759]' : 'text-[#86868b]'} />
                  <span>Permanent Member Deletion (Owner)</span>
                </div>

                <div className={`p-2.5 rounded-[10px] border flex items-center gap-2 ${
                  canExportBackup 
                    ? 'border-[#b9eec9] bg-[#eefcf2] text-[#1d1d1f]' 
                    : 'border-[#e0e0e0] bg-[#f5f5f7] text-[#86868b] line-through'
                }`}>
                  <CheckCircle2 size={14} className={canExportBackup ? 'text-[#34c759]' : 'text-[#86868b]'} />
                  <span>JSON Database Backup & Restore</span>
                </div>

                <div className={`p-2.5 rounded-[10px] border flex items-center gap-2 ${
                  canEditGymSettings 
                    ? 'border-[#b9eec9] bg-[#eefcf2] text-[#1d1d1f]' 
                    : 'border-[#e0e0e0] bg-[#f5f5f7] text-[#86868b] line-through'
                }`}>
                  <CheckCircle2 size={14} className={canEditGymSettings ? 'text-[#34c759]' : 'text-[#86868b]'} />
                  <span>Gym UPI & Receipt Configuration</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Security & Facility */}
        <div className="space-y-6">
          <div className="p-6 bg-white border border-[#e0e0e0] rounded-[18px] space-y-4">
            <div className="border-b border-[#f0f0f0] pb-2">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                <Lock size={14} className="text-[#0066cc]" />
                Security & Session
              </h3>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-[#fafafc] border border-[#e0e0e0] rounded-[12px]">
                <div className="text-[11px] text-[#86868b]">Session Status</div>
                <div className="text-[13px] font-semibold text-[#1d1d1f] mt-0.5">Authenticated</div>
                <div className="text-[11px] text-[#34c759]">Local database connected</div>
              </div>

              <div className="p-3 bg-[#fafafc] border border-[#e0e0e0] rounded-[12px]">
                <div className="text-[11px] text-[#86868b]">Operator ID</div>
                <div className="text-[13px] font-mono text-[#1d1d1f] mt-0.5 truncate">
                  {userProfile?.id || 'usr-master-001'}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#f0f0f0] space-y-2">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  setAuthScreen('register');
                }}
                className="w-full py-2.5 px-3 bg-[#fafafc] border border-[#e0e0e0] hover:border-[#0071e3] rounded-[10px] text-[#0066cc] font-medium text-[13px] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={14} />
                  Create New Gym Account
                </span>
                <ArrowRight size={13} />
              </button>

              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(true)}
                className="w-full py-2.5 px-3 bg-[#fff5f5] border border-[#ff3b30]/20 hover:bg-[#ffe5e5] rounded-[10px] text-[#ff3b30] font-medium text-[13px] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <LogOut size={14} />
                  Sign Out of Session
                </span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div className="p-6 bg-white border border-[#e0e0e0] rounded-[18px] space-y-3">
            <div className="border-b border-[#f0f0f0] pb-2">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                <Building2 size={14} className="text-[#0066cc]" />
                Gym Facility
              </h3>
            </div>

            <div>
              <div className="font-semibold text-[#1d1d1f] text-[15px]">
                {gym?.name || 'Iron Core Fitness'}
              </div>
              <div className="text-[12px] text-[#86868b] mt-1 leading-relaxed">
                {gym?.address || '102, Metro Complex, 80 Feet Road, Indiranagar, Bengaluru, Karnataka 560038'}
              </div>
              <div className="text-[12px] text-[#86868b] mt-2">
                Phone: {gym?.phone || '+91 98765 43210'}
              </div>
            </div>

            {onNavigate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigate('settings')}
                className="w-full gap-1.5 mt-2 text-[12px]"
              >
                <Layers size={13} />
                <span>Gym Settings</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {isLogoutConfirmOpen && (
        <ConfirmDialog
          isOpen={isLogoutConfirmOpen}
          onClose={() => setIsLogoutConfirmOpen(false)}
          onConfirm={handleConfirmLogout}
          title="Sign Out?"
          message="You will be safely signed out. You can log back in anytime with your credentials or OTP."
          confirmLabel="Sign Out"
        />
      )}
    </div>
  );
};
