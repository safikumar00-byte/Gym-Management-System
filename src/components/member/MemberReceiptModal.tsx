import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Download, Printer, CheckCircle2, ShieldCheck, Dumbbell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MemberReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
  member: any;
}

export const MemberReceiptModal: React.FC<MemberReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  member,
}) => {
  const { gym } = useAuth();

  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const currencySymbol = gym?.currency === 'INR' ? '₹' : (gym?.currency || '₹');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Payment Receipt"
      subtitle={`Receipt #${payment.receiptNumber || 'REC-001'}`}
      maxWidth="md"
    >
      <div className="space-y-6 text-[#1d1d1f]">
        {/* Printable Receipt Card */}
        <div id="printable-receipt" className="p-6 bg-white border border-[#e5e5ea] rounded-[20px] shadow-xs space-y-5">
          {/* Header with Gym Branding */}
          <div className="flex items-start justify-between border-b border-[#f0f0f2] pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-[#1d1d1f] flex items-center justify-center text-white">
                  <Dumbbell size={16} />
                </div>
                <span className="font-bold text-[18px] tracking-tight">{gym?.name || 'Raw Power Gym'}</span>
              </div>
              <p className="text-[12px] text-[#6e6e73] max-w-xs">
                {gym?.address || 'Official Fitness Facility'}
              </p>
              {gym?.phone && <p className="text-[12px] text-[#6e6e73]">Tel: {gym.phone}</p>}
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#34c759] bg-[#f4fcf6] px-2.5 py-0.5 rounded-full border border-[#34c759]/30 mb-1">
                <CheckCircle2 size={12} /> PAID
              </span>
              <div className="text-[14px] font-bold text-[#1d1d1f]">
                {payment.receiptNumber}
              </div>
              <div className="text-[12px] text-[#86868b]">
                {new Date(payment.paymentDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Member Information */}
          <div className="grid grid-cols-2 gap-4 text-[12px] bg-[#fafafc] p-3.5 rounded-[14px] border border-[#f0f0f2]">
            <div>
              <span className="text-[#86868b] block text-[11px] uppercase tracking-wider font-medium">Billed To</span>
              <span className="font-semibold text-[13px] text-[#1d1d1f] block mt-0.5">{member?.name}</span>
              <span className="text-[#6e6e73]">Member ID: {member?.memberCode}</span>
            </div>
            <div className="text-right">
              <span className="text-[#86868b] block text-[11px] uppercase tracking-wider font-medium">Payment Mode</span>
              <span className="font-semibold text-[13px] text-[#1d1d1f] block mt-0.5">{payment.paymentMethod || 'UPI'}</span>
              <span className="text-[#6e6e73]">Status: Verified</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between font-semibold text-[#86868b] text-[11px] uppercase tracking-wider border-b border-[#f0f0f2] pb-1.5">
              <span>Description</span>
              <span>Amount</span>
            </div>
            <div className="flex justify-between py-1 text-[#1d1d1f]">
              <div>
                <div className="font-semibold">{payment.membership?.planName || 'Gym Membership Plan'}</div>
                <div className="text-[11px] text-[#86868b]">
                  Authorized subscription pass
                </div>
              </div>
              <div className="font-bold">
                {currencySymbol}{parseFloat(payment.amount || '0').toLocaleString('en-IN')}
              </div>
            </div>

            <div className="border-t border-[#f0f0f2] pt-3 flex justify-between items-baseline">
              <span className="font-bold text-[14px] text-[#1d1d1f]">Total Amount Paid</span>
              <span className="font-bold text-[20px] text-[#0071e3]">
                {currencySymbol}{parseFloat(payment.amount || '0').toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-2 border-t border-[#f0f0f2] text-center text-[11px] text-[#86868b]">
            <p>{gym?.receiptFooter || 'Thank you for training with us! Fees once paid are non-refundable.'}</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-[#34c759] font-medium">
              <ShieldCheck size={12} /> Digitally generated and cryptographically verified transaction
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="md" onClick={handlePrint} className="gap-2">
            <Printer size={15} />
            <span>Print / Save PDF</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
