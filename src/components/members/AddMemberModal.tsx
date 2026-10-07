import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AppIcon } from '../ui/AppIcon';
import { PaymentMethod } from '../../types';
import { getPlans, addMemberWithDetails, getNextMemberId, getGym } from '../../lib/storage';
import { formatINR, getTodayString, addMonthsToDate } from '../../lib/calculations';
import { useToast } from '../ui/Toast';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const plans = getPlans();
  const gym = getGym();

  // Personal Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');

  // Membership
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(getTodayString());
  const [discount, setDiscount] = useState<number>(0);

  // Initial Payment
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isLoading, setIsLoading] = useState(false);

  const nextMemberId = useMemo(() => getNextMemberId(), [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setEmail('');
      setGender('Male');
      setDateOfBirth('');
      setAddress('');
      setEmergencyContact('');
      setNotes('');
      setStartDate(getTodayString());
      setDiscount(0);
      setPaymentMethod(gym.defaultPaymentMethod || 'UPI');
      if (plans.length > 0) {
        setPlanId(plans[0].id);
      }
    }
  }, [isOpen, gym.defaultPaymentMethod]);

  const selectedPlan = useMemo(() => {
    return plans.find((p) => p.id === planId) || plans[0];
  }, [plans, planId]);

  const totalFee = selectedPlan?.price || 0;
  const finalAmount = Math.max(0, totalFee - (discount || 0));

  const expiryDate = useMemo(() => {
    if (!selectedPlan) return getTodayString();
    return addMonthsToDate(startDate, selectedPlan.durationMonths);
  }, [startDate, selectedPlan]);

  useEffect(() => {
    if (finalAmount > 0 && !initialPaymentAmount) {
      setInitialPaymentAmount(finalAmount.toString());
    }
  }, [finalAmount]);

  const remainingAmount = Math.max(
    0,
    finalAmount - (parseFloat(initialPaymentAmount) || 0)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Member name and phone number are required', 'error');
      return;
    }

    if (!selectedPlan) {
      showToast('Please select a membership plan', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payAmt = parseFloat(initialPaymentAmount) || 0;
      addMemberWithDetails(
        {
          memberId: nextMemberId,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          gender,
          dateOfBirth,
          address: address.trim(),
          emergencyContact: emergencyContact.trim(),
          joinedDate: startDate,
          status: payAmt >= finalAmount ? 'ACTIVE' : 'PAYMENT PENDING',
          notes: notes.trim(),
        },
        selectedPlan.id,
        startDate,
        discount,
        payAmt,
        paymentMethod
      );

      setIsLoading(false);
      showToast(`Member ${name} registered (${nextMemberId})`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Failed to add member', 'error');
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-[#f2f2f7] hover:bg-[#ebebed] focus:bg-white border border-transparent focus:border-[#0071e3] rounded-[12px] text-[14px] text-[#1d1d1f] placeholder-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 transition-all";
  const labelClass = "text-[13px] font-medium text-[#1d1d1f] mb-1 block tracking-tight";

  const paymentMethods: PaymentMethod[] = ['UPI', 'Cash', 'Card', 'Bank Transfer'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Member"
      subtitle={`Auto-assigned ID: ${nextMemberId}`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Section 1: Personal Information */}
        <div className="space-y-4">
          <div className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider border-b border-[#f0f0f2] pb-2">
            Personal Information
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 9845012345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                placeholder="e.g. rahul@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className={inputClass}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Address</label>
              <input
                type="text"
                placeholder="e.g. Flat 302, Green Glen Layout, Bengaluru"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Emergency Contact</label>
              <input
                type="text"
                placeholder="e.g. Sunita Sharma (Mother) - 9845099999"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Membership Plan */}
        <div className="space-y-4">
          <div className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider border-b border-[#f0f0f2] pb-2">
            Membership Plan
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Select Plan *</label>
              <select
                value={planId}
                onChange={(e) => {
                  setPlanId(e.target.value);
                  const p = plans.find((pl) => pl.id === e.target.value);
                  if (p) setInitialPaymentAmount(p.price.toString());
                }}
                className={inputClass}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatINR(p.price)} ({p.durationMonths} Mo)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Expiry Date</label>
              <input
                type="date"
                readOnly
                value={expiryDate}
                className={`${inputClass} bg-[#e5e5ea] text-[#8e8e93] cursor-not-allowed`}
              />
            </div>
            <div>
              <label className={labelClass}>Discount (₹)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[16px] flex justify-between items-center text-[13px]">
            <span className="text-[#8e8e93]">Net Plan Fee:</span>
            <span className="text-[#1d1d1f] font-bold text-[16px]">{formatINR(finalAmount)}</span>
          </div>
        </div>

        {/* Section 3: Payment */}
        <div className="space-y-4">
          <div className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider border-b border-[#f0f0f2] pb-2">
            Initial Payment
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Amount Paid Now (₹)</label>
              <input
                type="number"
                min="0"
                max={finalAmount}
                value={initialPaymentAmount}
                onChange={(e) => setInitialPaymentAmount(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Payment Method</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {paymentMethods.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                      paymentMethod === m
                        ? 'bg-[#0071e3] text-white shadow-2xs'
                        : 'bg-[#f2f2f7] text-[#8e8e93] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[16px] flex justify-between items-center text-[13px]">
            <span className="text-[#8e8e93]">Balance Due:</span>
            <span
              className={`font-bold ${
                remainingAmount > 0 ? 'text-[#ff3b30]' : 'text-[#34c759]'
              }`}
            >
              {remainingAmount === 0 ? 'Settled in Full' : formatINR(remainingAmount)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-[#f0f0f2] flex justify-end gap-2.5">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="gap-1.5">
            <AppIcon name="plus" size={15} strokeWidth={2.4} />
            <span>Add Member</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
