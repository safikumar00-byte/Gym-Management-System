import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AppIcon } from '../ui/AppIcon';
import { Member, PaymentMethod } from '../../types';
import { getPlans, renewMembership, getMemberActiveMembership, getGym } from '../../lib/storage';
import { formatINR, getTodayString, addMonthsToDate } from '../../lib/calculations';
import { useToast } from '../ui/Toast';

interface RenewMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onSuccess?: () => void;
}

export const RenewMembershipModal: React.FC<RenewMembershipModalProps> = ({
  isOpen,
  onClose,
  member,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const plans = getPlans();
  const gym = getGym();

  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(getTodayString());
  const [discount, setDiscount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isLoading, setIsLoading] = useState(false);

  const activeMembership = useMemo(() => {
    if (!member) return null;
    return getMemberActiveMembership(member.id);
  }, [member]);

  useEffect(() => {
    if (isOpen && member) {
      if (activeMembership) {
        const expDate = new Date(activeMembership.expiryDate);
        const today = new Date(getTodayString());
        if (expDate >= today) {
          const nextDay = new Date(expDate);
          nextDay.setDate(nextDay.getDate() + 1);
          setStartDate(nextDay.toISOString().split('T')[0]);
        } else {
          setStartDate(getTodayString());
        }
        setPlanId(activeMembership.planId);
      } else if (plans.length > 0) {
        setStartDate(getTodayString());
        setPlanId(plans[0].id);
      }
      setDiscount(0);
      setPaymentMethod(gym.defaultPaymentMethod || 'UPI');
    }
  }, [isOpen, member, activeMembership, gym.defaultPaymentMethod]);

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
    if (finalAmount > 0 && !paymentAmount) {
      setPaymentAmount(finalAmount.toString());
    }
  }, [finalAmount]);

  if (!member) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) {
      showToast('Please select a membership plan', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payAmt = parseFloat(paymentAmount) || 0;
      renewMembership(
        member.id,
        selectedPlan.id,
        startDate,
        discount,
        payAmt,
        paymentMethod
      );

      setIsLoading(false);
      showToast(`Membership renewed for ${member.name}!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Renewal failed', 'error');
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-[#f2f2f7] hover:bg-[#ebebed] focus:bg-white border border-transparent focus:border-[#0071e3] rounded-[12px] text-[14px] text-[#1d1d1f] placeholder-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 transition-all";
  const labelClass = "text-[13px] font-medium text-[#1d1d1f] mb-1 block tracking-tight";

  const paymentMethods: PaymentMethod[] = ['UPI', 'Cash', 'Card', 'Bank Transfer'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Renew Membership"
      subtitle={`${member.name} (${member.memberId})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className={labelClass}>Select Plan *</label>
          <select
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              const p = plans.find((pl) => pl.id === e.target.value);
              if (p) setPaymentAmount(p.price.toString());
            }}
            className={inputClass}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatINR(p.price)} ({p.durationMonths} Months)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
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
            <label className={labelClass}>New Expiry Date</label>
            <input
              type="date"
              readOnly
              value={expiryDate}
              className={`${inputClass} bg-[#e5e5ea] text-[#8e8e93] cursor-not-allowed`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
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
          <div>
            <label className={labelClass}>Net Amount Due</label>
            <div className="px-3.5 py-2.5 bg-[#fafafc] border border-[#e5e5ea] rounded-[12px] text-[14px] text-[#1d1d1f] font-bold">
              {formatINR(finalAmount)}
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[16px] space-y-3.5">
          <div className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
            Immediate Payment Collection
          </div>
          <div>
            <label className={labelClass}>Amount Paid Now (₹)</label>
            <input
              type="number"
              min="0"
              max={finalAmount}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Payment Mode</label>
            <div className="flex flex-wrap gap-1.5">
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

        <div className="pt-3 border-t border-[#f0f0f2] flex justify-end gap-2.5">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="gap-1.5">
            <AppIcon name="refresh" size={14} />
            <span>Confirm Renewal</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
