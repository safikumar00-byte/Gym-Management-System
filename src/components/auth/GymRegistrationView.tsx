import React, { useState } from 'react';
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
  CheckCircle2, 
  Receipt, 
  MapPin,
  CreditCard
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { validatePassword, validateEmail } from '../../lib/validation.ts';

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
    registerGymAccount,
    signUpWithEmailPassword,
    firebaseUser 
  } = useAuth();
  const { showToast } = useToast();

  // Registration Form State (Empty initial values)
  const [gymName, setGymName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Strength & Conditioning',
    'Personal Coaching',
  ]);
  const [gymPhone, setGymPhone] = useState('');
  const [gymEmail, setGymEmail] = useState('');
  const [gymAddress, setGymAddress] = useState('');
  const [upiId, setUpiId] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [receiptPrefix, setReceiptPrefix] = useState('GM-');
  
  // Owner Credentials State
  const [ownerName, setOwnerName] = useState(firebaseUser?.displayName || '');
  const [ownerEmail, setOwnerEmail] = useState(firebaseUser?.email || '');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Validation
  const isOwnerEmailValid = validateEmail(ownerEmail);
  const isGymNameValid = gymName.trim().length >= 2;
  const isOwnerNameValid = ownerName.trim().length >= 2;
  const passwordValidation = validatePassword(password);
  const isPasswordValid = firebaseUser ? true : (passwordValidation.isValid && password === confirmPassword && confirmPassword.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isGymNameValid) {
      showToast('Please enter your Gym or Fitness Club name (min 2 characters)', 'error');
      return;
    }
    if (!isOwnerNameValid) {
      showToast('Please enter the gym owner name', 'error');
      return;
    }
    if (!isOwnerEmailValid) {
      showToast('Please enter a valid owner email address', 'error');
      return;
    }

    if (!firebaseUser) {
      if (!passwordValidation.isValid) {
        showToast(`Password requirements: ${passwordValidation.errors.join(', ')}`, 'error');
        return;
      }
      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // 1. Create Firebase User if not currently signed in
      if (!firebaseUser) {
        await signUpWithEmailPassword(ownerEmail.trim(), password, ownerName.trim());
      }

      // 2. Provision Gym and Owner Profile in Database
      await registerGymAccount({
        gymName: gymName.trim(),
        phone: gymPhone.trim() || ownerPhone.trim(),
        email: gymEmail.trim() || ownerEmail.trim(),
        address: gymAddress.trim(),
        upiId: upiId.trim(),
        currency: currency.trim().toUpperCase() || 'INR',
        receiptPrefix: receiptPrefix.trim().toUpperCase() || 'GM-',
        facilities: selectedTags,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPhone: ownerPhone.trim(),
        password: password ? password.trim() : undefined,
      });

      showToast(`Welcome! ${gymName.trim()} workspace created successfully.`, 'success');
      setAuthScreen('login');
    } catch (err: any) {
      showToast(err.message || 'Failed to create gym workspace. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-[#f2f2f7] hover:bg-[#ebebed] focus:bg-white border border-transparent focus:border-[#0071e3] rounded-[12px] text-[14px] text-[#1d1d1f] placeholder-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 transition-all";
  const labelClass = "text-[13px] font-semibold text-[#1d1d1f] mb-1.5 block tracking-tight";

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col justify-center items-center p-4 sm:p-6 font-sans antialiased selection:bg-[#0071e3]/20">
      <div className="w-full max-w-2xl space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setAuthScreen('login')}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#8e8e93] hover:text-[#1d1d1f] transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </button>
          <div className="flex items-center gap-1 text-[12px] font-semibold text-[#0071e3] bg-[#0071e3]/10 px-3 py-1 rounded-full">
            <Building2 size={13} />
            <span>New Gym Onboarding</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-[#e5e5ea] rounded-[28px] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="border-b border-[#f0f0f2] pb-5">
            <h2 className="text-[24px] font-bold text-[#1d1d1f] tracking-tight">
              Register Gym Workspace
            </h2>
            <p className="text-[13px] text-[#8e8e93] mt-1">
              Set up your commercial fitness center, staff roles, and starter membership plans.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Gym Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#1d1d1f]">
                <Building2 size={16} className="text-[#0071e3]" />
                <span>Gym / Fitness Center Profile</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Gym or Club Name *</label>
                  <input
                    type="text"
                    required
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="e.g. Iron Core Fitness & Gym"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Gym Contact Phone</label>
                  <input
                    type="tel"
                    value={gymPhone}
                    onChange={(e) => setGymPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Gym Official Email</label>
                  <input
                    type="email"
                    value={gymEmail}
                    onChange={(e) => setGymEmail(e.target.value)}
                    placeholder="e.g. contact@ironcoregym.com"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Gym Address</label>
                  <input
                    type="text"
                    value={gymAddress}
                    onChange={(e) => setGymAddress(e.target.value)}
                    placeholder="e.g. 12, Koramangala 5th Block, Bengaluru, KA 560095"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Facility Tags */}
              <div>
                <label className={labelClass}>Facilities & Programs Offered</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {FACILITY_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-[12px] font-medium px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0071e3] text-white shadow-2xs'
                            : 'bg-[#f2f2f7] text-[#6e6e73] hover:bg-[#e5e5ea]'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 2: Financial & Billing Details */}
            <div className="space-y-4 pt-2 border-t border-[#f0f0f2]">
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#1d1d1f]">
                <CreditCard size={16} className="text-[#34c759]" />
                <span>Billing & Receipt Settings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>UPI ID (for payments)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. ironcore@okhdfcbank"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Receipt Prefix</label>
                  <input
                    type="text"
                    value={receiptPrefix}
                    onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                    placeholder="GM-"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={inputClass}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Owner Account Credentials */}
            <div className="space-y-4 pt-2 border-t border-[#f0f0f2]">
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#1d1d1f]">
                <User size={16} className="text-[#af52de]" />
                <span>Gym Owner Account Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Full Name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Owner Phone</label>
                  <input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Owner Login Email *</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="e.g. rajesh@ironcoregym.com"
                    disabled={!!firebaseUser}
                    className={inputClass}
                  />
                </div>

                {!firebaseUser && (
                  <>
                    <div>
                      <label className={labelClass}>Create Password *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 8 chars, Aa1! required"
                          autoComplete="new-password"
                          className={`${inputClass} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e93] hover:text-[#1d1d1f] cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Password Strength Checklist */}
                      {password.length > 0 && (
                        <div className="p-3 bg-[#f2f2f7] rounded-[14px] mt-2 space-y-1 text-[11px]">
                          <div className="font-semibold text-[#1d1d1f] mb-1">Password Requirements:</div>
                          <div className={`flex items-center gap-1.5 ${passwordValidation.hasMinLength ? 'text-[#34c759]' : 'text-[#8e8e93]'}`}>
                            <span>{passwordValidation.hasMinLength ? '✓' : '○'}</span>
                            <span>At least 8 characters</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${passwordValidation.hasUppercase ? 'text-[#34c759]' : 'text-[#8e8e93]'}`}>
                            <span>{passwordValidation.hasUppercase ? '✓' : '○'}</span>
                            <span>At least one uppercase letter (A-Z)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${passwordValidation.hasLowercase ? 'text-[#34c759]' : 'text-[#8e8e93]'}`}>
                            <span>{passwordValidation.hasLowercase ? '✓' : '○'}</span>
                            <span>At least one lowercase letter (a-z)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${passwordValidation.hasNumber ? 'text-[#34c759]' : 'text-[#8e8e93]'}`}>
                            <span>{passwordValidation.hasNumber ? '✓' : '○'}</span>
                            <span>At least one number (0-9)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${passwordValidation.hasSpecialChar ? 'text-[#34c759]' : 'text-[#8e8e93]'}`}>
                            <span>{passwordValidation.hasSpecialChar ? '✓' : '○'}</span>
                            <span>At least one special character (!@#$%^&*)</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Confirm Password *</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                        className={`${inputClass} ${
                          confirmPassword && password !== confirmPassword ? 'border-[#ff3b30] focus:border-[#ff3b30]' : ''
                        }`}
                      />
                      {confirmPassword && password !== confirmPassword && (
                        <span className="text-[12px] text-[#ff3b30] font-medium mt-1 block">
                          Passwords do not match
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#f0f0f2]">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                disabled={!isGymNameValid || !isOwnerNameValid || !isOwnerEmailValid || !isPasswordValid}
                className="w-full justify-center text-[15px] font-semibold shadow-xs"
              >
                Create Gym Workspace & Start
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
