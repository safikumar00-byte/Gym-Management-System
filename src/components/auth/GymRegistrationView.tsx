import React, { useState, useEffect, useRef } from 'react';
import { 
  Dumbbell, 
  Building2, 
  User, 
  Mail, 
  Smartphone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  QrCode, 
  Receipt, 
  KeyRound, 
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';

const FACILITY_TAGS = [
  'Strength & Conditioning',
  'Functional CrossFit',
  'Cardio & Fat Loss',
  'Heavy Weightlifting',
  'Boxing & MMA',
  'Personal Coaching',
  'Steam & Sauna',
  '24/7 Access'
];

export const GymRegistrationView: React.FC = () => {
  const { 
    setAuthScreen, 
    startGymRegistration, 
    verifyGymRegistration, 
    resendGymRegistrationOtp, 
    clearPendingRegistration,
    pendingRegistration 
  } = useAuth();
  const { showToast } = useToast();

  // Registration Form State
  const [gymName, setGymName] = useState('Apex Strength & Conditioning');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Strength & Conditioning',
    'Personal Coaching',
  ]);
  const [gymPhone, setGymPhone] = useState('+91 98450 77889');
  const [gymEmail, setGymEmail] = useState('contact@apexstrength.in');
  const [gymAddress, setGymAddress] = useState('12, Koramangala 5th Block, Bengaluru, KA 560095');
  const [upiId, setUpiId] = useState('apexstrength@okhdfcbank');
  const [currency, setCurrency] = useState('INR');
  const [receiptPrefix, setReceiptPrefix] = useState('APEX-');
  
  // Owner Credentials State
  const [ownerName, setOwnerName] = useState('Suresh Kumar');
  const [ownerEmail, setOwnerEmail] = useState('suresh@apexstrength.in');
  const [ownerPhone, setOwnerPhone] = useState('+91 98450 77889');
  const [password, setPassword] = useState('ApexOwner@2026');
  const [confirmPassword, setConfirmPassword] = useState('ApexOwner@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationChannel, setVerificationChannel] = useState<'phone' | 'email'>('phone');

  // Step 2 OTP Screen State
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [dispatchedCode, setDispatchedCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [copiedCode, setCopiedCode] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>(pendingRegistration ? 'otp' : 'form');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (pendingRegistration) {
      setStep('otp');
      setDispatchedCode(pendingRegistration.expectedCode);
    }
  }, [pendingRegistration]);

  useEffect(() => {
    if (step !== 'otp' || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleProceedToOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gymName.trim()) {
      showToast('Please enter your Gym or Fitness Club name', 'error');
      return;
    }
    if (!ownerName.trim()) {
      showToast('Please enter the gym owner name', 'error');
      return;
    }
    if (!ownerEmail.trim()) {
      showToast('Please enter the owner email address', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const code = await startGymRegistration({
        gymName: gymName.trim(),
        phone: gymPhone.trim(),
        email: gymEmail.trim(),
        address: gymAddress.trim(),
        upiId: upiId.trim(),
        currency: currency.trim().toUpperCase(),
        receiptPrefix: receiptPrefix.trim().toUpperCase(),
        facilities: selectedTags,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPhone: ownerPhone.trim(),
        password: password.trim(),
        verificationChannel,
      });

      setDispatchedCode(code);
      setResendCooldown(30);
      setStep('otp');
      setOtpValues(['', '', '', '', '', '']);
      showToast(`Verification code sent via ${verificationChannel.toUpperCase()}: ${code}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to start registration', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpValues];
    updated[index] = cleanVal;
    setOtpValues(updated);

    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...otpValues];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setOtpValues(updated);

    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  const handleAutoFillCode = () => {
    if (!dispatchedCode) return;
    const digits = dispatchedCode.split('').slice(0, 6);
    setOtpValues(digits);
    showToast('Dispatched verification code auto-filled');
    if (inputRefs.current[5]) {
      inputRefs.current[5].focus();
    }
  };

  const handleCopyCode = () => {
    if (!dispatchedCode) return;
    navigator.clipboard.writeText(dispatchedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    showToast('OTP copied to clipboard');
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      setIsSubmitting(true);
      const code = await resendGymRegistrationOtp();
      setDispatchedCode(code);
      setResendCooldown(30);
      setOtpValues(['', '', '', '', '', '']);
      showToast(`New verification code sent: ${code}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to resend code', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = otpValues.join('');
    if (fullCode.length !== 6) {
      showToast('Please enter all 6 digits of the OTP code', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await verifyGymRegistration(fullCode);
      showToast(`Gym workspace created! Welcome to ${result.gym.name}!`);
    } catch (err: any) {
      showToast(err.message || 'OTP verification failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToForm = () => {
    clearPendingRegistration();
    setStep('form');
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-[#f5f5f7] border border-[#e0e0e0] rounded-[10px] text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] transition-all";
  const labelClass = "text-[12px] font-medium text-[#1d1d1f] mb-1 block";

  return (
    <div className="min-h-screen bg-[#fafafc] text-[#1d1d1f] flex flex-col justify-center items-center p-4 sm:p-8">
      <div className="w-full max-w-2xl space-y-6 my-4">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#e0e0e0] rounded-full text-[#0066cc] text-[12px] font-medium shadow-sm">
            <Dumbbell size={14} />
            <span>Gym Self-Registration</span>
          </div>

          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] tracking-tight">
            {step === 'form' ? 'Create Your Gym Workspace' : 'Verify Your Identity'}
          </h1>
          <p className="text-[14px] text-[#86868b] max-w-md mx-auto">
            {step === 'form'
              ? 'Self-service facility setup • Automatic member sequence • Instant UPI QR receipts'
              : `Enter the 6-digit verification code sent to activate ${gymName}`}
          </p>

          {/* Stepper indicator */}
          <div className="flex items-center justify-center gap-3 pt-2 text-[13px]">
            <div className={`flex items-center gap-1.5 font-medium ${step === 'form' ? 'text-[#0071e3]' : 'text-[#34c759]'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 'form' ? 'bg-[#0071e3] text-white' : 'bg-[#34c759] text-white'}`}>
                {step === 'otp' ? '✓' : '1'}
              </span>
              <span>1. Gym & Owner Setup</span>
            </div>
            <div className="w-8 h-[1px] bg-[#e0e0e0]" />
            <div className={`flex items-center gap-1.5 font-medium ${step === 'otp' ? 'text-[#0071e3]' : 'text-[#86868b]'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 'otp' ? 'bg-[#0071e3] text-white' : 'bg-[#e0e0e0] text-[#86868b]'}`}>
                2
              </span>
              <span>2. OTP Activation</span>
            </div>
          </div>
        </div>

        {/* STEP 1: REGISTRATION FORM */}
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div
              key="step-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white border border-[#e0e0e0] rounded-[22px] shadow-sm p-6 sm:p-8 space-y-6"
            >
              <form onSubmit={handleProceedToOtp} className="space-y-6">
                {/* SECTION 1: GYM INFORMATION */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#f0f0f0] text-[#0066cc] text-[14px] font-semibold">
                    <Building2 size={16} />
                    <span>Gym & Facility Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>
                        Gym / Club Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={gymName}
                        onChange={(e) => setGymName(e.target.value)}
                        placeholder="e.g. Apex Strength & Fitness"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Facility Phone *
                      </label>
                      <input
                        type="text"
                        required
                        value={gymPhone}
                        onChange={(e) => setGymPhone(e.target.value)}
                        placeholder="+91 98450 12345"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Facility Email
                      </label>
                      <input
                        type="email"
                        value={gymEmail}
                        onChange={(e) => setGymEmail(e.target.value)}
                        placeholder="desk@apexgym.in"
                        className={inputClass}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>
                        Physical Address
                      </label>
                      <input
                        type="text"
                        value={gymAddress}
                        onChange={(e) => setGymAddress(e.target.value)}
                        placeholder="12, Koramangala 5th Block, Bengaluru, KA 560095"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={`${labelClass} flex items-center gap-1.5`}>
                        <QrCode size={13} className="text-[#0066cc]" />
                        <span>Business UPI ID (for QR receipts)</span>
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="apexgym@okaxis"
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelClass}>
                          Currency
                        </label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className={inputClass}
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="AED">AED (د.إ)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                      </div>

                      <div>
                        <label className={`${labelClass} flex items-center gap-1.5`}>
                          <Receipt size={13} className="text-[#0066cc]" />
                          <span>Receipt Prefix</span>
                        </label>
                        <input
                          type="text"
                          value={receiptPrefix}
                          onChange={(e) => setReceiptPrefix(e.target.value)}
                          placeholder="APEX-"
                          className={`${inputClass} uppercase`}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label className={labelClass}>
                        Facility Specializations & Amenities
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {FACILITY_TAGS.map((tag) => {
                          const isSelected = selectedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTag(tag)}
                              className={`px-3 py-1 text-[12px] font-medium rounded-full border transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0071e3] border-[#0071e3] text-white'
                                  : 'bg-white border-[#e0e0e0] text-[#1d1d1f] hover:bg-[#f5f5f7]'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: OWNER CREDENTIALS & LOGIN PASSWORD */}
                <div className="space-y-4 pt-4 border-t border-[#f0f0f0]">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#f0f0f0] text-[#0066cc] text-[14px] font-semibold">
                    <User size={16} />
                    <span>Owner Profile & Login Credentials</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>
                        Owner Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. Suresh Kumar"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Owner Login Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="suresh@apexstrength.in"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Mobile Number (for SMS OTP) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="+91 98450 77889"
                        className={inputClass}
                      />
                    </div>

                    {/* PASSWORD FIELD */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className={labelClass}>
                          Create Login Password *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[11px] text-[#0071e3] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                          <span>{showPassword ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className={`${inputClass} pr-9`}
                        />
                        <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
                      </div>
                    </div>

                    {/* CONFIRM PASSWORD */}
                    <div>
                      <label className={labelClass}>
                        Confirm Password *
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className={inputClass}
                      />
                    </div>

                    {/* PREFERRED OTP DISPATCH CHANNEL */}
                    <div className="sm:col-span-2 space-y-1.5 pt-1">
                      <label className={labelClass}>
                        Dispatch Activation OTP Via
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setVerificationChannel('phone')}
                          className={`p-3 text-[13px] font-medium rounded-[12px] border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            verificationChannel === 'phone'
                              ? 'bg-[#f5f9ff] border-[#0071e3] text-[#0071e3] shadow-sm'
                              : 'bg-[#fafafc] border-[#e0e0e0] text-[#1d1d1f] hover:border-[#b0b0b5]'
                          }`}
                        >
                          <Smartphone size={15} />
                          <span>SMS Mobile OTP</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setVerificationChannel('email')}
                          className={`p-3 text-[13px] font-medium rounded-[12px] border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            verificationChannel === 'email'
                              ? 'bg-[#f5f9ff] border-[#0071e3] text-[#0071e3] shadow-sm'
                              : 'bg-[#fafafc] border-[#e0e0e0] text-[#1d1d1f] hover:border-[#b0b0b5]'
                          }`}
                        >
                          <Mail size={15} />
                          <span>Email OTP Code</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SUBMIT BUTTONS */}
                <div className="pt-2 space-y-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full justify-center gap-2 py-3 text-[14px]"
                  >
                    <span>Generate Gym & Proceed to OTP</span>
                    <ArrowRight size={16} />
                  </Button>

                  <div className="flex items-center justify-between text-[13px] pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthScreen('login')}
                      className="text-[#86868b] hover:text-[#1d1d1f] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Already have an account? Sign In</span>
                    </button>

                    <div className="text-[12px] text-[#34c759] flex items-center gap-1 font-medium">
                      <ShieldCheck size={14} />
                      <span>Starter Membership Plans Included</span>
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          {/* STEP 2: DEDICATED OTP VERIFICATION SCREEN */}
          {step === 'otp' && (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white border border-[#e0e0e0] rounded-[22px] shadow-sm p-6 sm:p-8 space-y-6"
            >
              {/* Target info card */}
              <div className="p-4 bg-[#fafafc] border border-[#e0e0e0] rounded-[14px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f5f9ff] border border-[#0071e3]/30 flex items-center justify-center text-[#0071e3] shrink-0">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#1d1d1f]">
                      {gymName}
                    </div>
                    <div className="text-[12px] text-[#86868b]">
                      Recipient: <span className="text-[#0071e3] font-medium">{verificationChannel === 'phone' ? (ownerPhone || gymPhone) : ownerEmail}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBackToForm}
                  className="text-[12px] text-[#0071e3] hover:underline font-medium cursor-pointer"
                >
                  Edit Details
                </button>
              </div>

              {/* LIVE DISPATCH NOTIFICATION BANNER */}
              {dispatchedCode && (
                <div className="p-4 bg-[#f5f9ff] border border-[#0071e3]/30 rounded-[14px] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-[#0066cc] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} />
                      <span>{verificationChannel === 'phone' ? 'SMS Gateway Dispatch' : 'Email Gateway Dispatch'}</span>
                    </div>
                    <span className="text-[11px] text-[#34c759] font-medium">Delivered</span>
                  </div>

                  <p className="text-[13px] text-[#1d1d1f]">
                    Verification code for <strong>{gymName}</strong> is{' '}
                    <span className="text-[16px] font-semibold text-[#0071e3] tracking-widest px-2 py-0.5 bg-white border border-[#0071e3]/30 rounded-[6px]">
                      {dispatchedCode}
                    </span>
                    . Valid for 10 minutes.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAutoFillCode}
                      className="px-3 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-[12px] font-medium flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                    >
                      <CheckCircle2 size={13} />
                      <span>1-Click Auto-Fill Code</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="text-[12px] text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-1 px-3 py-1.5 border border-[#e0e0e0] rounded-full hover:bg-white cursor-pointer transition-colors"
                    >
                      {copiedCode ? <Check size={13} className="text-[#34c759]" /> : <Copy size={13} />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 6-DIGIT PIN INPUTS */}
              <div className="space-y-3 text-center">
                <label className="text-[13px] font-medium text-[#1d1d1f] block">
                  Enter 6-digit verification code
                </label>

                <div className="flex justify-center gap-2 sm:gap-3">
                  {otpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className={`w-11 h-13 sm:w-13 sm:h-15 text-center text-[22px] font-semibold rounded-[12px] border transition-all ${
                        digit
                          ? 'border-[#0071e3] bg-[#f5f9ff] text-[#0071e3]'
                          : 'border-[#e0e0e0] bg-[#f5f5f7] text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[12px] text-[#86868b]">
                  Tip: You can paste the 6-digit code directly into the boxes.
                </p>
              </div>

              {/* ACTIONS */}
              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting || otpValues.join('').length !== 6}
                  onClick={() => handleVerifyOtp()}
                  className="w-full justify-center gap-2 py-3 text-[14px]"
                >
                  <CheckCircle2 size={16} />
                  <span>Verify OTP & Launch Workspace</span>
                </Button>

                <div className="flex items-center justify-between text-[13px] pt-1">
                  <button
                    type="button"
                    onClick={handleBackToForm}
                    className="text-[#86868b] hover:text-[#1d1d1f] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Gym Details</span>
                  </button>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isSubmitting}
                    onClick={handleResendOtp}
                    className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                      resendCooldown > 0
                        ? 'text-[#86868b] cursor-not-allowed'
                        : 'text-[#0071e3] hover:underline cursor-pointer'
                    }`}
                  >
                    <RefreshCw size={13} className={isSubmitting ? 'animate-spin' : ''} />
                    <span>
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Security badge */}
              <div className="pt-3 border-t border-[#f0f0f0] text-[12px] text-[#86868b] flex items-center justify-center gap-2">
                <ShieldCheck size={14} className="text-[#34c759]" />
                <span>Verified Account • Stored Securely</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
