import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth, AppRole } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { 
  ShieldCheck, 
  Smartphone, 
  Mail, 
  Sparkles, 
  Crown, 
  Briefcase, 
  UserCheck2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  LogOut,
  Info,
  Lock,
  Dumbbell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = 'roles' | 'phone' | 'email' | 'google';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    role, 
    userProfile, 
    verification, 
    updateRole, 
    signInWithGoogle, 
    signInWithPhoneFast, 
    startPhoneSetup, 
    verifyPhoneSetup,
    signInWithEmailFast,
    startEmailSetup,
    verifyEmailSetup,
    pendingSetup,
    clearPendingSetup,
    logout,
    gym,
    firebaseUser,
    loading
  } = useAuth();

  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AuthTab>('roles');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState(userProfile?.name || '');
  const [gymName, setGymName] = useState(gym?.name || 'Apex Strength');
  const [selectedRole, setSelectedRole] = useState<AppRole>(role);
  const [formMode, setFormMode] = useState<'setup' | 'login'>('setup');

  // Phone flow
  const [phone, setPhone] = useState(userProfile?.phone || '+91 98765 43210');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCodeHint, setSentCodeHint] = useState<string | null>(null);

  // Email flow
  const [email, setEmail] = useState(userProfile?.email || 'operator@gym.com');

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      showToast('Authenticated via Google Cloud Services');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Google authentication failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (formMode === 'login') {
        await signInWithEmailFast(email);
        showToast(`Signed in with verified email: ${email}`);
        onClose();
      } else {
        if (!pendingSetup || pendingSetup.type !== 'email') {
          const code = await startEmailSetup({
            name: name || 'Gym Operator',
            email,
            gymName: gymName || 'Apex Strength',
            role: selectedRole,
          });
          setSentCodeHint(code);
          showToast(`Verification code sent: ${code}`);
        } else {
          await verifyEmailSetup(verificationCode);
          showToast('Email verified successfully!');
          setSentCodeHint(null);
          onClose();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Email authentication failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (formMode === 'login') {
        await signInWithPhoneFast(phone);
        showToast(`Signed in with verified mobile: ${phone}`);
        onClose();
      } else {
        if (!pendingSetup || pendingSetup.type !== 'phone') {
          const code = await startPhoneSetup({
            phoneNumber: phone,
            name: name || 'Gym Manager',
            gymName: gymName || 'Apex Strength',
            role: selectedRole,
          });
          setSentCodeHint(code);
          showToast(`SMS OTP sent: ${code}`);
        } else {
          await verifyPhoneSetup(verificationCode);
          showToast('Mobile verified successfully!');
          setSentCodeHint(null);
          onClose();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Phone verification failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (newRole: AppRole) => {
    try {
      await updateRole(newRole);
      setSelectedRole(newRole);
      showToast(`Switched active view to ${newRole.toUpperCase()}`);
    } catch {
      showToast('Failed to switch role', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      clearPendingSetup();
      setSentCodeHint(null);
      showToast('Signed out of session');
      onClose();
    } catch {
      showToast('Failed to sign out', 'error');
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-[#f5f5f7] border border-[#e0e0e0] rounded-[10px] text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] transition-all";
  const labelClass = "text-[12px] font-medium text-[#1d1d1f] mb-1 block";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Identity & Access Management"
      subtitle={`${gym?.name || 'Commercial Gym'} • Multi-Login & Role Separation`}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-5 text-[13px] text-[#1d1d1f]">
        {/* Active Session & Verification Status Banner */}
        <div className="p-4 bg-[#fafafc] border border-[#e0e0e0] rounded-[16px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f5f9ff] border border-[#0071e3]/30 flex items-center justify-center font-semibold text-[15px] text-[#0071e3] shrink-0">
              {(userProfile?.name || firebaseUser?.displayName || 'O').charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#1d1d1f] truncate">
                  {userProfile?.name || firebaseUser?.displayName || 'Active Operator'}
                </span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  role === 'owner' 
                    ? 'border-[#0071e3]/30 text-[#0071e3] bg-[#f5f9ff]' 
                    : role === 'manager'
                    ? 'border-[#ff9500]/30 text-[#ff9500] bg-[#fffaf0]'
                    : 'border-[#34c759]/30 text-[#34c759] bg-[#f4fcf6]'
                }`}>
                  {role.toUpperCase()}
                </span>
              </div>
              <div className="text-[12px] text-[#86868b] truncate">
                {userProfile?.email || userProfile?.phone || firebaseUser?.email || 'kiran@apexstrength.in'}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-0.5">
            {verification.isVerified ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-[#34c759] font-medium bg-[#f4fcf6] border border-[#34c759]/30 px-2.5 py-1 rounded-full">
                <CheckCircle2 size={13} />
                <span>
                  {verification.method === 'google' 
                    ? 'Google Verified' 
                    : verification.method === 'phone'
                    ? 'Mobile Verified'
                    : 'Email Verified'}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-[#ff9500] font-medium bg-[#fffaf0] border border-[#ff9500]/30 px-2.5 py-1 rounded-full">
                <AlertCircle size={13} />
                <span>Verification Required</span>
              </span>
            )}
            <span className="text-[11px] text-[#86868b]">
              Daily logins bypass verification
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 bg-[#f5f5f7] rounded-full border border-[#e0e0e0]">
          {[
            { id: 'roles', label: 'Role Access', icon: ShieldCheck },
            { id: 'phone', label: 'Mobile OTP', icon: Smartphone },
            { id: 'email', label: 'Email', icon: Mail },
            { id: 'google', label: 'Google', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id as AuthTab); clearPendingSetup(); }}
                className={`flex-1 py-1.5 px-2 rounded-full text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* TAB 1: ROLE SEPARATION */}
          {activeTab === 'roles' && (
            <motion.div
              key="tab-roles"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-4"
            >
              <div className="text-[12px] text-[#86868b] flex items-center gap-2">
                <Info size={14} className="text-[#0071e3] shrink-0" />
                <span>
                  Select an identity role to test permissions and separated views across the application.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* OWNER CARD */}
                <div
                  onClick={() => handleRoleChange('owner')}
                  className={`p-4 rounded-[14px] border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    role === 'owner'
                      ? 'border-[#0071e3] bg-[#f5f9ff] shadow-sm'
                      : 'border-[#e0e0e0] bg-white hover:border-[#b0b0b5]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 font-semibold text-[13px] text-[#1d1d1f]">
                        <Crown size={15} className="text-[#0066cc]" /> OWNER
                      </span>
                      {role === 'owner' && (
                        <span className="text-[10px] bg-[#0071e3] text-white font-medium px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#86868b] leading-relaxed">
                       Complete authority. Billing, refunds, exports, staff accounts, and settings.
                    </p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#f0f0f0] text-[11px] text-[#34c759]">
                    <div>✓ Financial reports & exports</div>
                    <div>✓ Payment refunds & member delete</div>
                    <div>✓ Audit trail review</div>
                  </div>
                </div>

                {/* MANAGER CARD */}
                <div
                  onClick={() => handleRoleChange('manager')}
                  className={`p-4 rounded-[14px] border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    role === 'manager'
                      ? 'border-[#ff9500] bg-[#fffaf0] shadow-sm'
                      : 'border-[#e0e0e0] bg-white hover:border-[#b0b0b5]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 font-semibold text-[13px] text-[#1d1d1f]">
                        <Briefcase size={15} className="text-[#ff9500]" /> MANAGER
                      </span>
                      {role === 'manager' && (
                        <span className="text-[10px] bg-[#ff9500] text-white font-medium px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#86868b] leading-relaxed">
                      Operations supervisor. Payments, expenses, onboarding, and revenue charts.
                    </p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#f0f0f0] text-[11px]">
                    <div className="text-[#34c759]">✓ Collect payments & renew</div>
                    <div className="text-[#34c759]">✓ Log operational expenses</div>
                    <div className="text-[#ff3b30]">✗ No refunds or DB exports</div>
                  </div>
                </div>

                {/* TRAINER CARD */}
                <div
                  onClick={() => handleRoleChange('trainer')}
                  className={`p-4 rounded-[14px] border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    role === 'trainer'
                      ? 'border-[#34c759] bg-[#f4fcf6] shadow-sm'
                      : 'border-[#e0e0e0] bg-white hover:border-[#b0b0b5]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 font-semibold text-[13px] text-[#1d1d1f]">
                        <UserCheck2 size={15} className="text-[#34c759]" /> TRAINER
                      </span>
                      {role === 'trainer' && (
                        <span className="text-[10px] bg-[#34c759] text-white font-medium px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#86868b] leading-relaxed">
                      Coaching & member interaction. Member directory, attendance, and workouts.
                    </p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#f0f0f0] text-[11px]">
                    <div className="text-[#34c759]">✓ View member directory</div>
                    <div className="text-[#ff3b30]">✗ Financial stats hidden</div>
                    <div className="text-[#ff3b30]">✗ No billing access</div>
                  </div>
                </div>

                {/* MEMBER CARD */}
                <div
                  onClick={() => handleRoleChange('member')}
                  className={`p-4 rounded-[14px] border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    role === 'member'
                      ? 'border-[#af52de] bg-[#fbf5fd] shadow-sm'
                      : 'border-[#e0e0e0] bg-white hover:border-[#b0b0b5]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 font-semibold text-[13px] text-[#1d1d1f]">
                        <Dumbbell size={15} className="text-[#af52de]" /> MEMBER
                      </span>
                      {role === 'member' && (
                        <span className="text-[10px] bg-[#af52de] text-white font-medium px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#86868b] leading-relaxed">
                      Member portal app. Daily check-in, community wall, personal membership dues, workouts, and receipts.
                    </p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#f0f0f0] text-[11px]">
                    <div className="text-[#34c759]">✓ Check-in & streak</div>
                    <div className="text-[#34c759]">✓ Community feed & reactions</div>
                    <div className="text-[#af52de]">✓ My plans & receipts</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: MOBILE NUMBER (PHONE OTP) */}
          {activeTab === 'phone' && (
            <motion.div
              key="tab-phone"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-4"
            >
              <div className="flex p-1 bg-[#f5f5f7] rounded-full border border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => { setFormMode('setup'); clearPendingSetup(); }}
                  className={`flex-1 py-1 px-2 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                    formMode === 'setup' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b]'
                  }`}
                >
                  Initial Setup (OTP Verification)
                </button>
                <button
                  type="button"
                  onClick={() => { setFormMode('login'); clearPendingSetup(); }}
                  className={`flex-1 py-1 px-2 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                    formMode === 'login' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b]'
                  }`}
                >
                  Daily Login
                </button>
              </div>

              <form onSubmit={handlePhoneAction} className="space-y-3">
                {formMode === 'setup' && !pendingSetup && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Operator Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Patel"
                        required
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Gym / Club Name</label>
                      <input
                        type="text"
                        value={gymName}
                        onChange={(e) => setGymName(e.target.value)}
                        placeholder="e.g. Apex Strength"
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Mobile Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    disabled={!!pendingSetup}
                    className={inputClass}
                  />
                </div>

                {pendingSetup?.type === 'phone' && (
                  <div className="p-3 bg-[#f5f9ff] border border-[#0071e3]/30 rounded-[12px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[12px] text-[#0066cc] flex items-center gap-1.5">
                        <Lock size={13} /> Enter 6-digit SMS code
                      </span>
                      {sentCodeHint && (
                        <span className="text-[11px] text-[#34c759] font-medium">
                          OTP: {sentCodeHint}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      required
                      className={`${inputClass} text-center font-semibold text-[16px] tracking-widest`}
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  {pendingSetup && (
                    <button
                      type="button"
                      onClick={clearPendingSetup}
                      className="text-[#86868b] hover:text-[#1d1d1f] text-[12px] cursor-pointer"
                    >
                      Change Number / Cancel
                    </button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                    className="gap-2 ml-auto text-[13px]"
                  >
                    <span>
                      {formMode === 'login'
                        ? 'Instant Daily Login'
                        : pendingSetup
                        ? 'Verify OTP & Complete Setup'
                        : 'Send Verification OTP'}
                    </span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* TAB 3: EMAIL VERIFICATION */}
          {activeTab === 'email' && (
            <motion.div
              key="tab-email"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-4"
            >
              <div className="flex p-1 bg-[#f5f5f7] rounded-full border border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => { setFormMode('setup'); clearPendingSetup(); }}
                  className={`flex-1 py-1 px-2 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                    formMode === 'setup' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b]'
                  }`}
                >
                  First-Time Setup
                </button>
                <button
                  type="button"
                  onClick={() => { setFormMode('login'); clearPendingSetup(); }}
                  className={`flex-1 py-1 px-2 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                    formMode === 'login' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b]'
                  }`}
                >
                  Daily Login
                </button>
              </div>

              <form onSubmit={handleEmailAction} className="space-y-3">
                {formMode === 'setup' && !pendingSetup && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Operator Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Srikant Sharma"
                        required
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Gym / Business Name</label>
                      <input
                        type="text"
                        value={gymName}
                        onChange={(e) => setGymName(e.target.value)}
                        placeholder="e.g. Apex Strength"
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@gym.com"
                    required
                    disabled={!!pendingSetup}
                    className={inputClass}
                  />
                </div>

                {pendingSetup?.type === 'email' && (
                  <div className="p-3 bg-[#f5f9ff] border border-[#0071e3]/30 rounded-[12px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[12px] text-[#0066cc] flex items-center gap-1.5">
                        <Mail size={13} /> Enter email verification code
                      </span>
                      {sentCodeHint && (
                        <span className="text-[11px] text-[#34c759] font-medium">
                          Code: {sentCodeHint}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      required
                      className={`${inputClass} text-center font-semibold text-[16px] tracking-widest`}
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  {pendingSetup && (
                    <button
                      type="button"
                      onClick={clearPendingSetup}
                      className="text-[#86868b] hover:text-[#1d1d1f] text-[12px] cursor-pointer"
                    >
                      Cancel / Back
                    </button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                    className="gap-2 ml-auto text-[13px]"
                  >
                    <span>
                      {formMode === 'login'
                        ? 'Instant Daily Login'
                        : pendingSetup
                        ? 'Verify & Finish Setup'
                        : 'Send Verification Code'}
                    </span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* TAB 4: GOOGLE IDENTITY */}
          {activeTab === 'google' && (
            <motion.div
              key="tab-google"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-4"
            >
              <div className="p-5 bg-[#fafafc] border border-[#e0e0e0] rounded-[16px] space-y-3 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#f5f9ff] border border-[#0071e3]/30 flex items-center justify-center text-[#0071e3]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-[14px] text-[#1d1d1f]">Google Cloud Authentication</h4>
                  <p className="text-[#86868b] text-[12px] max-w-sm mx-auto mt-1">
                    Sign in with your verified Google Account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting || loading}
                  className="w-full max-w-xs mx-auto py-2.5 px-4 bg-white border border-[#e0e0e0] hover:bg-[#f5f5f7] rounded-full text-[#1d1d1f] font-medium text-[13px] flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isSubmitting ? 'Connecting...' : 'Continue with Google'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#f0f0f0] flex items-center justify-between">
          {firebaseUser ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="text-[#ff3b30] hover:underline font-medium text-[12px] flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut size={13} /> Sign Out of Cloud Session
            </button>
          ) : (
            <span className="text-[12px] text-[#86868b]">
              Local & Cloud Synced
            </span>
          )}

          <Button variant="secondary" size="md" onClick={onClose} className="text-[12px]">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
