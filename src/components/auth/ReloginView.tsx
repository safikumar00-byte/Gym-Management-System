import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { 
  Dumbbell, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck,
  Building2,
  Eye,
  EyeOff,
  User,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AuthTab = 'signin' | 'signup' | 'forgot';

export const ReloginView: React.FC = () => {
  const { 
    firebaseUser,
    isLoggedIn,
    isEmailVerified,
    signInWithEmailPassword, 
    signUpWithEmailPassword, 
    signInWithGoogle, 
    sendVerificationEmail,
    sendPasswordReset,
    reloadUser,
    logout,
    setAuthScreen
  } = useAuth();

  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Cooldown timers
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Validation rules
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email.trim());
  const isPasswordLengthValid = password.length >= 6;
  const doPasswordsMatch = password === confirmPassword;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }
    if (!isEmailValid) {
      showToast('Please enter a valid email address format', 'error');
      return;
    }
    if (!password) {
      showToast('Please enter your password', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await signInWithEmailPassword(email, password);
      showToast('Signed in successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Authentication failed. Please verify credentials.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter your full name', 'error');
      return;
    }
    if (!isEmailValid) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (!isPasswordLengthValid) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }
    if (!doPasswordsMatch) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await signUpWithEmailPassword(email, password, name);
      showToast('Account created! A verification link has been sent to your email.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) {
      showToast('Please enter a valid email address to receive password reset link', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await sendPasswordReset(email);
      showToast('Password reset email dispatched! Please check your inbox and spam folder.', 'success');
      setActiveTab('signin');
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch password reset link', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      showToast('Authenticated via Google Identity', 'success');
    } catch (err: any) {
      if (!err.message?.includes('cancelled')) {
        showToast(err.message || 'Google sign-in failed', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    try {
      setIsSubmitting(true);
      await sendVerificationEmail();
      setResendCooldown(60);
      showToast('Verification email resent! Please check your inbox.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to resend verification email', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshVerification = async () => {
    try {
      setIsSubmitting(true);
      await reloadUser();
      if (isEmailVerified) {
        showToast('Email verified successfully! Welcome aboard.', 'success');
      } else {
        showToast('Email not yet verified. Please click the link in your email first.', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to refresh verification status', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-[#f2f2f7] hover:bg-[#ebebed] focus:bg-white border border-transparent focus:border-[#0071e3] rounded-[14px] text-[14px] text-[#1d1d1f] placeholder-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 transition-all";
  const labelClass = "text-[13px] font-semibold text-[#1d1d1f] mb-1.5 block tracking-tight";

  // If logged in via email/password but not yet verified, show verification requirement screen
  if (isLoggedIn && !isEmailVerified) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4 selection:bg-[#0071e3]/20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white border border-[#e5e5ea] rounded-[28px] p-8 shadow-xl text-center space-y-6"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
            <Mail size={32} />
          </div>

          <div>
            <h2 className="text-[24px] font-bold text-[#1d1d1f] tracking-tight">Verify Your Email</h2>
            <p className="text-[13px] text-[#8e8e93] mt-2 leading-relaxed">
              We sent a verification link to <br />
              <strong className="text-[#1d1d1f] font-semibold">{firebaseUser?.email}</strong>
            </p>
          </div>

          <div className="p-4 bg-[#f2f2f7] rounded-[18px] text-[13px] text-[#6e6e73] text-left space-y-1.5">
            <div className="flex items-center gap-2 font-medium text-[#1d1d1f]">
              <AlertCircle size={15} className="text-[#ff9500]" />
              <span>Action Required</span>
            </div>
            <p>1. Open the email in your inbox or spam folder.</p>
            <p>2. Click the verification link.</p>
            <p>3. Return here and click <strong>Check Verification Status</strong>.</p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={handleRefreshVerification}
              isLoading={isSubmitting}
              className="w-full justify-center text-[14px]"
            >
              <RefreshCw size={16} className="mr-2" />
              Check Verification Status
            </Button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendCooldown > 0 || isSubmitting}
              className="text-[13px] font-semibold text-[#0071e3] hover:underline disabled:opacity-50 cursor-pointer py-1"
            >
              {resendCooldown > 0 
                ? `Resend Verification Email (${resendCooldown}s)` 
                : 'Resend Verification Email'}
            </button>

            <button
              type="button"
              onClick={logout}
              className="text-[13px] font-medium text-[#8e8e93] hover:text-[#ff3b30] transition-colors cursor-pointer pt-2"
            >
              Sign Out & Use Another Account
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col justify-center items-center p-4 sm:p-6 font-sans antialiased selection:bg-[#0071e3]/20">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[18px] bg-[#1d1d1f] text-white shadow-md mb-1">
            <Dumbbell size={26} />
          </div>
          <h1 className="text-[28px] font-bold text-[#1d1d1f] tracking-tight">
            Gym Manager
          </h1>
          <p className="text-[14px] text-[#8e8e93]">
            Commercial Fitness Management Cloud
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-[#e5e5ea] rounded-[28px] p-6 sm:p-8 shadow-xl space-y-6">
          {/* Tab Selector */}
          <div className="flex p-1 bg-[#f2f2f7] rounded-full border border-[#e5e5ea]">
            <button
              type="button"
              onClick={() => { setActiveTab('signin'); }}
              className={`flex-1 py-2 px-3 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'signin' ? 'bg-white text-[#1d1d1f] shadow-xs' : 'text-[#8e8e93] hover:text-[#1d1d1f]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('signup'); }}
              className={`flex-1 py-2 px-3 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'signup' ? 'bg-white text-[#1d1d1f] shadow-xs' : 'text-[#8e8e93] hover:text-[#1d1d1f]'
              }`}
            >
              Create Account
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* TAB 1: SIGN IN */}
            {activeTab === 'signin' && (
              <motion.form
                key="signin-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                onSubmit={handleSignIn}
                className="space-y-4"
              >
                <div>
                  <label className={labelClass}>Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@gym.com"
                      autoComplete="username"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[13px] font-semibold text-[#1d1d1f] tracking-tight">Password</label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('forgot')}
                      className="text-[12px] font-semibold text-[#0071e3] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93] hover:text-[#1d1d1f] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  className="w-full justify-center text-[14px] mt-2 font-semibold shadow-xs"
                >
                  Sign In to Workspace
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#e5e5ea]" />
                  </div>
                  <div className="relative flex justify-center text-[12px] uppercase">
                    <span className="bg-white px-3 text-[#8e8e93] font-medium">Or continue with</span>
                  </div>
                </div>

                {/* Google Sign-In */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-white border border-[#e5e5ea] hover:bg-[#fafafc] rounded-[14px] text-[#1d1d1f] font-semibold text-[13px] flex items-center justify-center gap-3 transition-all cursor-pointer shadow-2xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google Account</span>
                </button>
              </motion.form>
            )}

            {/* TAB 2: SIGN UP */}
            {activeTab === 'signup' && (
              <motion.form
                key="signup-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                onSubmit={handleSignUp}
                className="space-y-4"
              >
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    autoComplete="name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gym.com"
                    autoComplete="username"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      autoComplete="new-password"
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93] hover:text-[#1d1d1f] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className={`${inputClass} ${
                      confirmPassword && !doPasswordsMatch ? 'border-[#ff3b30] focus:border-[#ff3b30]' : ''
                    }`}
                  />
                  {confirmPassword && !doPasswordsMatch && (
                    <span className="text-[12px] text-[#ff3b30] font-medium mt-1 block">
                      Passwords do not match
                    </span>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  disabled={!isPasswordLengthValid || !doPasswordsMatch || !isEmailValid}
                  className="w-full justify-center text-[14px] mt-2 font-semibold shadow-xs"
                >
                  Create Firebase Account
                </Button>
              </motion.form>
            )}

            {/* TAB 3: FORGOT PASSWORD */}
            {activeTab === 'forgot' && (
              <motion.form
                key="forgot-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                onSubmit={handleForgotPassword}
                className="space-y-4"
              >
                <div>
                  <label className={labelClass}>Registered Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className={inputClass}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  className="w-full justify-center text-[14px]"
                >
                  Send Password Reset Link
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('signin')}
                    className="text-[13px] font-semibold text-[#8e8e93] hover:text-[#1d1d1f] transition-colors cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Register New Gym Workspace Link */}
        <div className="text-center p-4 bg-white/60 backdrop-blur-md border border-[#e5e5ea] rounded-[22px]">
          <p className="text-[13px] text-[#6e6e73]">
            Setting up a new fitness center or branch?
          </p>
          <button
            type="button"
            onClick={() => setAuthScreen('register')}
            className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#0071e3] hover:underline cursor-pointer"
          >
            <Building2 size={15} />
            <span>Register New Gym Workspace</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
