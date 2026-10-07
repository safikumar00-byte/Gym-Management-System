import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AppIcon } from '../ui/AppIcon';
import { Member, Payment, PaymentMethod, Gym } from '../../types';
import { 
  getMembers, 
  getMemberActiveMembership, 
  getPayments, 
  addPayment, 
  getGym 
} from '../../lib/storage';
import { formatINR, calculatePendingAmount, getTodayString } from '../../lib/calculations';
import { useToast } from '../ui/Toast';
import { ReceiptModal } from './ReceiptModal';
import { SearchInput } from '../ui/SearchInput';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMemberId?: string;
  onPaymentSuccess?: (payment: Payment) => void;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedMemberId,
  onPaymentSuccess,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayString());
  const [isLoading, setIsLoading] = useState(false);
  const [recordedPayment, setRecordedPayment] = useState<Payment | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const gym: Gym = getGym();
  const allMembers = getMembers();

  useEffect(() => {
    if (isOpen) {
      if (preselectedMemberId) {
        setSelectedMemberId(preselectedMemberId);
      } else {
        setSelectedMemberId('');
      }
      setSearchTerm('');
      setAmount('');
      setNotes('');
      setPaymentMethod(gym.defaultPaymentMethod || 'UPI');
      setPaymentDate(getTodayString());
      setRecordedPayment(null);
      setShowReceipt(false);
    }
  }, [isOpen, preselectedMemberId, gym.defaultPaymentMethod]);

  const selectedMember = useMemo(() => {
    return allMembers.find((m) => m.id === selectedMemberId);
  }, [allMembers, selectedMemberId]);

  const currentMembership = useMemo(() => {
    if (!selectedMember) return null;
    return getMemberActiveMembership(selectedMember.id);
  }, [selectedMember]);

  const financialSummary = useMemo(() => {
    if (!currentMembership) return { totalFee: 0, paid: 0, pending: 0 };
    const payments = getPayments().filter(
      (p) => p.membershipId === currentMembership.id && p.status !== 'Refunded'
    );
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const pending = calculatePendingAmount(currentMembership.finalAmount, totalPaid);
    return {
      totalFee: currentMembership.finalAmount,
      paid: totalPaid,
      pending,
    };
  }, [currentMembership]);

  useEffect(() => {
    if (selectedMember && currentMembership && financialSummary.pending > 0 && !amount) {
      setAmount(financialSummary.pending.toString());
    }
  }, [selectedMember, currentMembership, financialSummary.pending, amount]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return allMembers.slice(0, 8);
    const query = searchTerm.toLowerCase();
    return allMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.memberId.toLowerCase().includes(query) ||
        m.phone.includes(query)
    ).slice(0, 10);
  }, [allMembers, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !currentMembership) {
      showToast('Please select a member with an active plan', 'error');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (currentMembership && financialSummary.pending > 0 && numAmount > (financialSummary.pending + 0.01)) {
      showToast(`Payment amount (${formatINR(numAmount)}) exceeds outstanding balance (${formatINR(financialSummary.pending)})`, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const newPayment = addPayment({
        memberId: selectedMember.id,
        membershipId: currentMembership.id,
        amount: numAmount,
        paymentDate,
        paymentMethod,
        notes,
      });

      setIsLoading(false);
      setRecordedPayment(newPayment);
      showToast(`Payment of ${formatINR(numAmount)} recorded`);
      if (onPaymentSuccess) {
        onPaymentSuccess(newPayment);
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Unable to save payment', 'error');
    }
  };

  const paymentMethods: PaymentMethod[] = ['UPI', 'Cash', 'Card', 'Bank Transfer', 'Other'];
  const inputClass = "w-full px-3.5 py-2.5 bg-[#f2f2f7] hover:bg-[#ebebed] focus:bg-white border border-transparent focus:border-[#0071e3] rounded-[12px] text-[14px] text-[#1d1d1f] placeholder-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 transition-all";
  const labelClass = "text-[13px] font-medium text-[#1d1d1f] mb-1 block tracking-tight";

  return (
    <>
      <Modal
        isOpen={isOpen && !showReceipt}
        onClose={onClose}
        title={recordedPayment ? 'Payment Recorded' : 'Collect Payment'}
        subtitle={
          recordedPayment
            ? `Receipt #${recordedPayment.receiptNumber}`
            : 'Record fee payment and generate digital receipt'
        }
        maxWidth="lg"
      >
        {recordedPayment ? (
          <div className="flex flex-col gap-6 py-2">
            <div className="p-6 bg-[#fafafc] border border-[#e5e5ea] rounded-[20px] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#34c759]/12 text-[#34c759] flex items-center justify-center mx-auto">
                <AppIcon name="checkmark.circle" size={28} strokeWidth={2.2} />
              </div>
              <h3 className="text-[28px] font-bold text-[#1d1d1f] tracking-tight">
                {formatINR(recordedPayment.amount)}
              </h3>
              <p className="text-[13px] text-[#8e8e93]">
                Received from <span className="font-semibold text-[#1d1d1f]">{selectedMember?.name}</span>
              </p>
              <div className="inline-block px-3 py-1 bg-white border border-[#e5e5ea] rounded-full text-[12px] text-[#0071e3] font-medium shadow-2xs">
                Receipt #{recordedPayment.receiptNumber}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowReceipt(true)}
                className="w-full"
              >
                View Receipt
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
                className="w-full"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Step 1: Member Selection */}
            {!selectedMember ? (
              <div className="space-y-3">
                <label className={labelClass}>Select Member</label>
                <SearchInput
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClear={() => setSearchTerm('')}
                  placeholder="Search member by name, phone or ID..."
                />

                <div className="border border-[#e5e5ea] rounded-[16px] max-h-56 overflow-y-auto divide-y divide-[#f0f0f2] bg-white">
                  {filteredMembers.length === 0 ? (
                    <div className="p-6 text-center text-[#8e8e93] text-[13px]">
                      No matching members found
                    </div>
                  ) : (
                    filteredMembers.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMemberId(m.id);
                          setSearchTerm('');
                        }}
                        className="p-3.5 flex items-center justify-between hover:bg-[#fafafc] active:bg-[#f2f2f7] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center text-[12px] font-semibold">
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-[#1d1d1f] font-semibold text-[13px]">{m.name}</div>
                            <div className="text-[11px] text-[#8e8e93]">{m.memberId} • {m.phone}</div>
                          </div>
                        </div>
                        <span className="text-[12px] text-[#0071e3] font-medium flex items-center gap-1">
                          Select <AppIcon name="chevron.right" size={12} />
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Selected Member Card */
              <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[16px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-[#e5e5ea] flex items-center justify-center text-[14px] font-bold text-[#0071e3] shadow-2xs">
                    {selectedMember.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[#1d1d1f] font-semibold text-[14px]">{selectedMember.name}</div>
                    <div className="text-[12px] text-[#8e8e93]">{selectedMember.memberId} • {selectedMember.phone}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMemberId('');
                    setAmount('');
                  }}
                  className="text-[12px] text-[#0071e3] font-medium hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}

            {/* Plan Overview */}
            {selectedMember && (
              <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[16px] space-y-3">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[#8e8e93]">Active Plan</span>
                  <span className="font-semibold text-[#1d1d1f]">{currentMembership?.planName || 'None'}</span>
                </div>

                {currentMembership ? (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#f0f0f2] text-center">
                    <div>
                      <div className="text-[11px] text-[#8e8e93]">Total Fee</div>
                      <div className="text-[13px] font-semibold text-[#1d1d1f] mt-0.5">
                        {formatINR(financialSummary.totalFee)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#8e8e93]">Paid</div>
                      <div className="text-[13px] font-semibold text-[#34c759] mt-0.5">
                        {formatINR(financialSummary.paid)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#8e8e93]">Due Balance</div>
                      <div className={`text-[13px] font-semibold mt-0.5 ${
                        financialSummary.pending > 0 ? 'text-[#ff3b30]' : 'text-[#34c759]'
                      }`}>
                        {financialSummary.pending === 0 ? 'Settled' : formatINR(financialSummary.pending)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-[#ff9500]">
                    This member has no active plan. Please renew first.
                  </p>
                )}
              </div>
            )}

            {/* Payment Fields */}
            {selectedMember && currentMembership && (
              <>
                <div>
                  <label className={labelClass}>Payment Amount (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className={inputClass}
                  />
                  {financialSummary.pending > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(financialSummary.pending.toString())}
                      className="text-[11px] text-[#0071e3] hover:underline mt-1.5 block cursor-pointer font-medium"
                    >
                      Fill remaining due: {formatINR(financialSummary.pending)}
                    </button>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Payment Method *</label>
                  <div className="flex flex-wrap gap-1.5">
                    {paymentMethods.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                          paymentMethod === method
                            ? 'bg-[#0071e3] text-white shadow-xs'
                            : 'bg-[#f2f2f7] text-[#8e8e93] hover:text-[#1d1d1f]'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelClass}>Payment Date</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Notes / Reference (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. UPI Ref #402910"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#f0f0f2] flex justify-end gap-2.5">
                  <Button type="button" variant="secondary" size="md" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isLoading}
                    disabled={!amount || parseFloat(amount) <= 0}
                  >
                    Record Payment
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>

      {showReceipt && recordedPayment && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            onClose();
          }}
          payment={recordedPayment}
          member={selectedMember}
          membership={currentMembership}
          gym={gym}
        />
      )}
    </>
  );
};
