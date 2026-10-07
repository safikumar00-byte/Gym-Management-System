import React, { useState } from 'react';
import { useAuth, AppRole } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { 
  Dumbbell, 
  Crown, 
  Briefcase, 
  UserCheck2, 
  Lock, 
  Sparkles, 
  Smartphone, 
  Mail, 
  ArrowRight, 
  ShieldCheck,
  Zap,
  KeyRound,
  Building2,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ReloginTab = 'fast' | 'email' | 'phone' | 'google';

export const ReloginView: React.FC = () => {
  const { 
    lastLoggedOutAccount, 
    gym, 
    reloginFast, 
    signInWithGoogle, 
    signInAsDemoMember,
    signInWithPhoneFast, 
    startPhoneSetup, 
    verifyPhoneSetup,
    signInWithEmailFast,
    signInWithEmailPassword,
    startEmailSetup,
    verifyEmailSetup,
    pendingSetup,
    clearPendingSetup,
    setAuthScreen
  } = useAuth();

  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ReloginTab>('fast');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDemoMemberLogin = async () => {
    try {
      setIsSubmitting(true);
      await signInAsDemoMember();
      showToast('Welcome to Raw Power Gym — Demo, Alex!');
    } catch (err: any) {
      showToast(err.message || 'Failed to sign in as demo member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phone form
  const [phone, setPhone] = useState('+91 98765 43210');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneCodeHint, setPhoneCodeHint] = useState<string | null>(null);

  // Email form
  const [email, setEmail] = useState('rajesh@ironcoregym.com');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeHint, setEmailCodeHint] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<'password' | 'otp'>('password');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);

  const rememberedAccount = lastLoggedOutAccount || {
    id: 'user-01',
    gymId: 'gym-01',
    name: 'Rajesh Sharma',
    email: 'rajesh@ironcoregym.com',
    phone: '+91 98765 43210',
    role: 'owner' as const,
    createdAt: '2026-01-01',
  };

  const quickProfiles = [
    {
      name: 'Rajesh Sharma',
      role: 'owner' as AppRole,
      email: 'rajesh@ironcoregym.com',
      badge: 'Owner (Full Access)',
      icon: Crown,
      color: 'text-[#0066cc]',
      accentBg: 'bg-[#f5f9ff] border-[#0071e3]/30',
    },
    {
      name: 'Amit Patel',
      role: 'manager' as AppRole,
      email: 'amit@ironcoregym.com',
      badge: 'Manager (Operations)',
      icon: Briefcase,
      color: 'text-[#ff9500]',
      accentBg: 'bg-[#fffaf0] border-[#ff9500]/30',
    },
    {
      name: 'Vikram Singh',
      role: 'trainer' as AppRole,
      email: 'vikram@ironcoregym.com',
      badge: 'Trainer (Coach)',
      icon: UserCheck2,
      color: 'text-[#34c759]',
      accentBg: 'bg-[#f4fcf6] border-[#34c759]/30',
    },
  ];

  const handleQuickRelogin = async (roleOverride?: AppRole, customProfile?: any) => {
    try {
      setIsSubmitting(true);
      if (customProfile) {
        await reloginFast(customProfile);
        showToast(`Welcome back, ${customProfile.name}!`);
      } else if (roleOverride) {
        await reloginFast(roleOverride);
        showToast(`Signed in as ${roleOverride.toUpperCase()}`);
      } else {
        await reloginFast(rememberedAccount);
        showToast(`Welcome back, ${rememberedAccount.name}!`);
      }
    } catch {
      showToast('Failed to resume session', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      showToast('Authenticated via Google Identity');
    } catch (err: any) {
      showToast(err.message || 'Google sign-in failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (!pendingSetup) {
        try {
          await signInWithPhoneFast(phone);
          showToast(`Welcome back! Phone ${phone} verified.`);
        } catch {
          const code = await startPhoneSetup({
            phoneNumber: phone,
            name: 'Gym Operator',
            gymName: gym?.name || 'Iron Core Fitness',
            role: 'owner',
          });
          setPhoneCodeHint(code);
          showToast(`SMS OTP sent: ${code}`);
        }
      } else {
        await verifyPhoneSetup(phoneOtp);
        showToast('Mobile verified successfully!');
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (emailMode === 'password') {
        if (!password.trim()) {
          showToast('Please enter your password', 'error');
          return;
        }
        await signInWithEmailPassword(email, password);
        showToast(`Welcome back, ${email}!`);
      } else {
        if (!pendingSetup) {
          try {
            await signInWithEmailFast(email);
            showToast(`Welcome back, ${email}!`);
          } catch {
            const code = await startEmailSetup({
              email,
              name: 'Gym Operator',
              gymName: gym?.name || 'Iron Core Fitness',
              role: 'owner',
            });
            setEmailCodeHint(code);
            showToast(`Verification code generated: ${code}`);
          }
        } else {
          await verifyEmailSetup(emailCode);
          showToast('Email verified successfully!');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-[#f5f5f7] border border-[#e0e0e0] rounded-[10px] text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] transition-all";
  const labelClass = "text-[12px] font-medium text-[#1d1d1f] mb-1 block";

  return (
    <div className="min-h-screen bg-[#fafafc] text-[#1d1d1f] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#e0e0e0] rounded-full text-[#0066cc] text-[12px] font-medium shadow-sm">
            <Dumbbell size={14} />
            <span>{gym?.name || 'Iron Core Fitness'}</span>
          </div>

          <h1 className="text-[28px] sm:text-[32px] font-semibold text-[#1d1d1f] tracking-tight">
            Sign In to Continue
          </h1>
          <p className="text-[13px] text-[#86868b] max-w-sm mx-auto">
            Commercial Gym Management System
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white border border-[#e0e0e0] rounded-[22px] shadow-sm p-6 sm:p-7 space-y-6">
          {/* DEDICATED DEMO MEMBER SIGN-IN */}
          <div className="p-4 rounded-[18px] bg-gradient-to-br from-[#1d1d1f] via-[#242426] to-[#2c2c2e] text-white shadow-xs border border-black/10 relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0071e3] text-white tracking-wide uppercase shadow-xs">
                <Sparkles size={11} />
                DEMO MEMBER
              </span>
              <span className="text-[11px] text-white/60 font-medium">Isolated Sandbox</span>
            </div>
            
            <h3 className="text-[15px] font-semibold text-white tracking-tight">
              Instant Member Experience
            </h3>
            <p className="text-[12px] text-white/70 mt-0.5 leading-relaxed">
              Sign in as <strong>Alex Johnson (RPM-DEMO-001)</strong> with live attendance streaks, assigned workouts, community feed, and digital pass.
            </p>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDemoMemberLogin}
              className="mt-3.5 w-full py-2.5 px-4 bg-white hover:bg-[#f5f5f7] active:scale-[0.99] text-[#1d1d1f] font-semibold text-[13px] rounded-[12px] flex items-center justify-between transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3]">
                  <UserCheck2 size={13} />
                </div>
                <span>Continue as Demo Member</span>
              </div>
              <ArrowRight size={14} className="text-[#86868b]" />
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#e5e5ea]"></div>
            <span className="flex-shrink mx-3 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">
              Or Staff Sign In
            </span>
            <div className="flex-grow border-t border-[#e5e5ea]"></div>
          </div>

          {/* Apple Segmented Method Tabs */}
          <div className="flex p-1 bg-[#f5f5f7] rounded-full border border-[#e0e0e0]">
            {[
              { id: 'fast', label: 'Quick Access', icon: Zap },
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'phone', label: 'Mobile', icon: Smartphone },
              { id: 'google', label: 'Google', icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveTab(tab.id as ReloginTab); clearPendingSetup(); }}
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

          <AnimatePresence mode="wait">
            {/* TAB 1: ONE-TAP FAST RELOGIN */}
            {activeTab === 'fast' && (
              <motion.div
                key="tab-fast"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-4"
              >
                {/* Remembered Account Card */}
                <div className="p-4 bg-[#fafafc] border border-[#e0e0e0] rounded-[16px] space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span className="text-[#0066cc] flex items-center gap-1.5">
                      <Zap size={13} />
                      Last Active Operator
                    </span>
                    <span className="text-[#34c759]">Saved Profile</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#f5f9ff] border border-[#0071e3]/30 flex items-center justify-center font-semibold text-[16px] text-[#0071e3] shrink-0">
                      {rememberedAccount.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-[#1d1d1f] truncate">
                        {rememberedAccount.name}
                      </div>
                      <div className="text-[12px] text-[#86868b] truncate">
                        {rememberedAccount.email}
                      </div>
                      <div className="text-[11px] text-[#86868b] mt-0.5 capitalize">
                        Role: <span className="font-semibold text-[#1d1d1f]">{rememberedAccount.role}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    onClick={() => handleQuickRelogin()}
                    className="w-full justify-center gap-2 mt-1 text-[13px]"
                  >
                    <span>Continue as {rememberedAccount.name}</span>
                    <ArrowRight size={14} />
                  </Button>
                </div>

                {/* Quick Role Switcher */}
                <div className="space-y-2 pt-2 border-t border-[#f0f0f0]">
                  <div className="text-[11px] font-medium text-[#86868b]">
                    Or switch operator role:
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {quickProfiles.map((p) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.role}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleQuickRelogin(p.role, {
                            id: `user-${p.role}`,
                            name: p.name,
                            email: p.email,
                            role: p.role,
                            gymId: gym?.id || 'gym-01',
                            createdAt: '2026-01-01',
                          })}
                          className={`p-3 rounded-[12px] border text-left flex items-center justify-between transition-all cursor-pointer ${p.accentBg} hover:opacity-90`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon size={16} className={p.color} />
                            <div>
                              <div className="font-semibold text-[13px] text-[#1d1d1f]">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-[#86868b]">
                                {p.badge} • {p.email}
                              </div>
                            </div>
                          </div>
                          <ArrowRight size={14} className="text-[#86868b]" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: EMAIL LOGIN (PASSWORD & OTP) */}
            {activeTab === 'email' && (
              <motion.div
                key="tab-email"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-4"
              >
                {/* Segmented Sub-control: Password vs OTP */}
                <div className="flex p-1 bg-[#f5f5f7] rounded-full border border-[#e0e0e0]">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode('password');
                      clearPendingSetup();
                    }}
                    className={`flex-1 py-1 px-2 rounded-full text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      emailMode === 'password'
                        ? 'bg-white text-[#1d1d1f] shadow-sm'
                        : 'text-[#86868b] hover:text-[#1d1d1f]'
                    }`}
                  >
                    <Lock size={12} />
                    <span>Password Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode('otp');
                      clearPendingSetup();
                    }}
                    className={`flex-1 py-1 px-2 rounded-full text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      emailMode === 'otp'
                        ? 'bg-white text-[#1d1d1f] shadow-sm'
                        : 'text-[#86868b] hover:text-[#1d1d1f]'
                    }`}
                  >
                    <KeyRound size={12} />
                    <span>Verify with OTP</span>
                  </button>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label className={labelClass}>
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rajesh@ironcoregym.com"
                      className={inputClass}
                    />
                  </div>

                  {/* Password Login Mode */}
                  {emailMode === 'password' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className={labelClass}>
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[11px] text-[#0071e3] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                          <span>{showPassword ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter account password"
                          className={`${inputClass} pr-9`}
                        />
                        <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
                      </div>

                      {/* Demo credential helpers */}
                      <div className="p-3 bg-[#fafafc] border border-[#e0e0e0] rounded-[10px] text-[11px] text-[#86868b] space-y-1 mt-2">
                        <div className="font-medium text-[#1d1d1f] flex items-center gap-1">
                          <Sparkles size={12} className="text-[#0066cc]" />
                          <span>Demo Operator Credentials:</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEmail('rajesh@ironcoregym.com');
                              setPassword('admin123');
                            }}
                            className="p-1.5 bg-white border border-[#e0e0e0] rounded-[8px] text-left hover:border-[#0071e3] cursor-pointer"
                          >
                            <strong>Owner:</strong> rajesh@ • admin123
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEmail('amit@ironcoregym.com');
                              setPassword('manager123');
                            }}
                            className="p-1.5 bg-white border border-[#e0e0e0] rounded-[8px] text-left hover:border-[#0071e3] cursor-pointer"
                          >
                            <strong>Manager:</strong> amit@ • manager123
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OTP Mode */}
                  {emailMode === 'otp' && pendingSetup && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className={labelClass}>
                          Enter 6-digit OTP
                        </label>
                        {emailCodeHint && (
                          <span className="text-[11px] text-[#0066cc]">
                            Code: {emailCodeHint}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value)}
                        placeholder="123456"
                        className={`${inputClass} text-center text-[18px] tracking-widest font-semibold`}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full justify-center gap-2 text-[13px]"
                  >
                    <span>
                      {emailMode === 'password'
                        ? 'Sign In with Password'
                        : pendingSetup
                        ? 'Confirm Code & Sign In'
                        : 'Send Verification Code'}
                    </span>
                    <ArrowRight size={14} />
                  </Button>
                </form>
              </motion.div>
            )}

            {/* TAB 3: MOBILE PHONE OTP */}
            {activeTab === 'phone' && (
              <motion.div
                key="tab-phone"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div>
                    <label className={labelClass}>
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className={inputClass}
                    />
                  </div>

                  {pendingSetup && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className={labelClass}>
                          Enter 6-Digit OTP
                        </label>
                        {phoneCodeHint && (
                          <span className="text-[11px] text-[#0066cc]">
                            Code: {phoneCodeHint}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        placeholder="123456"
                        className={`${inputClass} text-center text-[18px] tracking-widest font-semibold`}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full justify-center gap-2 text-[13px]"
                  >
                    <span>{pendingSetup ? 'Verify OTP & Sign In' : 'Sign In with Mobile'}</span>
                    <ArrowRight size={14} />
                  </Button>
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
                className="space-y-4 text-center py-2"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-[#f5f9ff] border border-[#0071e3]/30 flex items-center justify-center text-[#0071e3]">
                  <Sparkles size={20} />
                </div>

                <div>
                  <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Google Cloud Identity</h3>
                  <p className="text-[#86868b] text-[13px] max-w-sm mx-auto mt-1">
                    Sign in with your verified Google account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-white border border-[#e0e0e0] hover:bg-[#f5f5f7] rounded-full text-[#1d1d1f] font-medium text-[13px] flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm"
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
                  <span>{isSubmitting ? 'Authenticating...' : 'Continue with Google'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SELF-SERVICE GYM CREATION CALLOUT */}
        <div className="p-5 bg-white border border-[#e0e0e0] rounded-[22px] text-center space-y-2.5 shadow-sm">
          <div className="text-[13px] font-semibold text-[#0066cc] flex items-center justify-center gap-1.5">
            <Building2 size={16} />
            <span>New Gym Owner or Facility Operator?</span>
          </div>
          <p className="text-[13px] text-[#86868b] max-w-sm mx-auto">
            Generate your own gym workspace, set custom pricing plans, and register your owner account with OTP verification.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setAuthScreen('register')}
            className="w-full justify-center gap-2 text-[13px]"
          >
            <Sparkles size={14} className="text-[#0066cc]" />
            <span>Create Account & Generate Gym</span>
            <ArrowRight size={14} />
          </Button>
        </div>

        {/* Security badge footer */}
        <div className="text-center text-[12px] text-[#86868b] flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-[#34c759]" />
          <span>Role-Based Access Control • Local & Cloud Synchronized</span>
        </div>
      </div>
    </div>
  );
};
