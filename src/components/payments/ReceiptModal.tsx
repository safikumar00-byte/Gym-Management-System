import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Payment, Member, Membership, Gym } from '../../types';
import { formatINR, formatDate, getWhatsAppUrl } from '../../lib/calculations';
import { exportReceiptPDF } from '../../lib/export';
import { useToast } from '../ui/Toast';
import { AppIcon } from '../ui/AppIcon';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  member?: Member | null;
  membership?: Membership | null;
  gym: Gym;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  member,
  membership,
  gym,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!payment) return null;

  const totalFee = membership ? membership.finalAmount : payment.amount;
  const remainingBalance = membership
    ? Math.max(0, membership.finalAmount - payment.amount)
    : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      exportReceiptPDF({
        gym,
        receiptNumber: payment.receiptNumber,
        paymentDate: payment.paymentDate,
        memberName: payment.memberName,
        memberId: member?.memberId || 'N/A',
        planName: membership?.planName || 'Gym Membership',
        totalFee,
        previousBalance: totalFee,
        amountPaid: payment.amount,
        remainingBalance,
        paymentMethod: payment.paymentMethod,
      });
      showToast('Receipt PDF downloaded');
    } catch {
      showToast('Error generating PDF receipt', 'error');
    }
  };

  const receiptSummaryText = `
*${gym.name.toUpperCase()}*
*OFFICIAL PAYMENT RECEIPT*
Receipt: ${payment.receiptNumber}
Date: ${formatDate(payment.paymentDate)}
Member: ${payment.memberName} (${member?.memberId || 'N/A'})
Plan: ${membership?.planName || 'Membership'}
--------------------------------
Amount Paid: ${formatINR(payment.amount)}
Remaining Balance: ${formatINR(remainingBalance)}
Payment Mode: ${payment.paymentMethod}
Status: ${payment.status}
--------------------------------
${gym.receiptFooter || 'Thank you for training with us!'}
`.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiptSummaryText);
      setCopied(true);
      showToast('Receipt text copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy receipt', 'error');
    }
  };

  const handleShareWhatsApp = () => {
    if (member?.phone) {
      const url = getWhatsAppUrl(member.phone, receiptSummaryText);
      window.open(url, '_blank');
    } else {
      showToast('Member phone not available', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payment Receipt"
      subtitle={`Receipt #${payment.receiptNumber}`}
      maxWidth="md"
    >
      <div className="flex flex-col gap-5">
        {/* Apple Invoice Card */}
        <div
          id="printable-receipt"
          className="p-5 sm:p-6 bg-white border border-[#e5e5ea] rounded-[20px] shadow-xs text-[13px] text-[#1d1d1f] space-y-4"
        >
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b border-[#f0f0f2]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-[7px] bg-[#0071e3] text-white flex items-center justify-center shrink-0">
                  <AppIcon name="dumbbell" size={13} strokeWidth={2.4} />
                </div>
                <h3 className="font-bold text-[16px] text-[#1d1d1f]">
                  {gym.name}
                </h3>
              </div>
              <p className="text-[12px] text-[#8e8e93]">{gym.address}</p>
              <p className="text-[12px] text-[#8e8e93]">Phone: {gym.phone}</p>
              {gym.gstin && (
                <p className="text-[11px] text-[#8e8e93]">GSTIN: {gym.gstin}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">Receipt No.</div>
              <div className="font-bold text-[15px] text-[#0071e3]">{payment.receiptNumber}</div>
              <div className="text-[12px] text-[#8e8e93] mt-0.5">{formatDate(payment.paymentDate)}</div>
            </div>
          </div>

          {/* Member & Plan Details */}
          <div className="grid grid-cols-2 gap-4 py-1">
            <div>
              <span className="text-[11px] font-medium text-[#8e8e93] block uppercase tracking-wider">Billed To</span>
              <span className="font-semibold text-[#1d1d1f] text-[14px] mt-0.5 block">{payment.memberName}</span>
              <span className="text-[12px] text-[#8e8e93] block">{member?.memberId || 'Member'}</span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-[#8e8e93] block uppercase tracking-wider">Plan Access</span>
              <span className="font-semibold text-[#1d1d1f] text-[14px] mt-0.5 block">{membership?.planName || 'Gym Access'}</span>
              <span className="text-[12px] text-[#8e8e93] block">Mode: {payment.paymentMethod}</span>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="pt-3 border-t border-[#f0f0f2] space-y-2">
            <div className="flex justify-between text-[#8e8e93]">
              <span>Plan Fee</span>
              <span>{formatINR(totalFee)}</span>
            </div>
            <div className="flex justify-between text-[#1d1d1f] font-bold text-[16px] pt-2 border-t border-[#f0f0f2]">
              <span>Amount Paid</span>
              <span className="text-[#34c759]">{formatINR(payment.amount)}</span>
            </div>
            <div className="flex justify-between text-[13px] pt-1">
              <span className="text-[#8e8e93]">Remaining Balance</span>
              <span className={remainingBalance > 0 ? 'text-[#ff3b30] font-semibold' : 'text-[#34c759] font-medium'}>
                {remainingBalance === 0 ? 'Settled (₹0)' : formatINR(remainingBalance)}
              </span>
            </div>
          </div>

          {/* Footer message */}
          <div className="pt-3 border-t border-[#f0f0f2] text-center text-[11px] text-[#8e8e93]">
            {gym.receiptFooter || 'Thank you for training with us!'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handlePrint} className="gap-1.5 text-[12px]">
              <AppIcon name="printer" size={14} />
              <span>Print</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadPDF} className="gap-1.5 text-[12px]">
              <AppIcon name="square.and.arrow.down" size={14} />
              <span>PDF</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCopy} className="gap-1.5 text-[12px]">
              <AppIcon name={copied ? 'checkmark' : 'doc.on.doc'} size={14} className={copied ? 'text-[#34c759]' : ''} />
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleShareWhatsApp}
            className="gap-1.5 text-[12px] bg-[#34c759] hover:bg-[#2fb350]"
          >
            <AppIcon name="message" size={14} />
            <span>WhatsApp</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
