import React, { useState, useMemo, useEffect } from 'react';
import { Payment, PaymentMethod, Gym } from '../../types';
import { 
  getPayments, 
  getMembers, 
  getMemberships, 
  getMemberActiveMembership,
  refundPayment, 
  deletePayment, 
  getGym 
} from '../../lib/storage';
import { formatINR, formatDate, getWhatsAppUrl, calculatePendingAmount } from '../../lib/calculations';
import { exportPaymentsCSV, exportPaymentsPDF } from '../../lib/export';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { SearchInput } from '../ui/SearchInput';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TableRowSkeleton } from '../ui/Skeleton';
import { AppIcon } from '../ui/AppIcon';
import { useAuth } from '../../context/AuthContext.tsx';

interface PaymentsViewProps {
  onAddPaymentClick: () => void;
  onViewReceiptClick: (payment: Payment) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  onAddPaymentClick,
  onViewReceiptClick,
}) => {
  const { showToast } = useToast();
  const { isOwner, isTrainer, canRefund } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const [paymentToRefund, setPaymentToRefund] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 150);
    return () => clearTimeout(timer);
  }, []);

  const gym: Gym = getGym();
  const payments = getPayments();
  const members = getMembers();
  const memberships = getMemberships();

  // Enriched payment list with membership plan names
  const enrichedPayments = useMemo(() => {
    return payments.map((p) => {
      const ms = memberships.find((m) => m.id === p.membershipId);
      const member = members.find((m) => m.id === p.memberId);
      return {
        ...p,
        planName: ms?.planName || 'Gym Membership',
        memberCode: member?.memberId || 'N/A',
        memberPhone: member?.phone || '',
      };
    });
  }, [payments, memberships, members]);

  const filteredPayments = useMemo(() => {
    return enrichedPayments.filter((p) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        p.memberName.toLowerCase().includes(query) ||
        p.receiptNumber.toLowerCase().includes(query) ||
        p.memberCode.toLowerCase().includes(query) ||
        (p.notes && p.notes.toLowerCase().includes(query));

      const matchesMethod =
        methodFilter === 'ALL' || p.paymentMethod === methodFilter;

      const matchesStatus =
        statusFilter === 'ALL' || p.status === statusFilter;

      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [enrichedPayments, searchTerm, methodFilter, statusFilter]);

  // Overall financial totals
  const totalCollected = useMemo(() => {
    return payments
      .filter((p) => p.status !== 'Refunded')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  // Members with outstanding fees
  const pendingMembers = useMemo(() => {
    return members
      .map((m) => {
        const ms = getMemberActiveMembership(m.id);
        if (!ms) return null;
        const paid = payments
          .filter((p) => p.membershipId === ms.id && p.status !== 'Refunded')
          .reduce((sum, p) => sum + p.amount, 0);
        const due = calculatePendingAmount(ms.finalAmount, paid);
        if (due > 0) {
          return { member: m, due, planName: ms.planName };
        }
        return null;
      })
      .filter(Boolean) as { member: typeof members[0]; due: number; planName: string }[];
  }, [members, payments]);

  const totalOutstanding = useMemo(() => {
    return pendingMembers.reduce((sum, item) => sum + item.due, 0);
  }, [pendingMembers]);

  const handleExportCSV = () => {
    exportPaymentsCSV(filteredPayments);
    showToast(`Exported ${filteredPayments.length} payment records to CSV`);
  };

  const handleExportPDF = () => {
    exportPaymentsPDF(filteredPayments, gym);
    showToast(`Generated payments PDF report`);
  };

  const handleRefundConfirm = () => {
    if (paymentToRefund) {
      refundPayment(paymentToRefund.id, 'Refund processed via admin dashboard');
      showToast(`Payment #${paymentToRefund.receiptNumber} refunded`);
      setPaymentToRefund(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (paymentToDelete) {
      deletePayment(paymentToDelete.id);
      showToast(`Payment #${paymentToDelete.receiptNumber} deleted`);
      setPaymentToDelete(null);
    }
  };

  const handleShareReceiptWhatsApp = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = `*Official Receipt — ${gym.name}*\nReceipt: ${p.receiptNumber}\nMember: ${p.memberName}\nAmount: ${formatINR(p.amount)}\nMethod: ${p.paymentMethod}\nDate: ${formatDate(p.paymentDate)}\n\nThank you for choosing ${gym.name}!`;
    const url = getWhatsAppUrl(p.memberPhone, msg);
    window.open(url, '_blank');
  };

  const handleSendPaymentReminder = (item: { member: typeof members[0]; due: number; planName: string }) => {
    const msg = `Hi ${item.member.name}, this is a gentle reminder from ${gym.name} regarding your pending membership balance of ${formatINR(item.due)} for ${item.planName}. Kindly clear it at your earliest convenience. Thank you!`;
    const url = getWhatsAppUrl(item.member.phone, msg);
    window.open(url, '_blank');
  };

  if (isTrainer) {
    return (
      <div className="p-8 bg-white border border-[#e5e5ea] rounded-[22px] text-center max-w-md mx-auto my-12 space-y-4 shadow-xs">
        <div className="w-12 h-12 mx-auto bg-[#f2f2f7] rounded-full text-[#8e8e93] flex items-center justify-center">
          <AppIcon name="lock" size={20} />
        </div>
        <div>
          <h3 className="text-[17px] font-bold text-[#1d1d1f] tracking-tight">Financial Ledger Restricted</h3>
          <p className="text-[13px] text-[#8e8e93] mt-1.5 leading-relaxed">
            Financial transactions and receipts are restricted to Owner and Manager roles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. TOP HEADER & PRIMARY ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[26px] sm:text-[30px] font-bold text-[#1d1d1f] tracking-tight">
            Payments
          </h2>
          <span className="text-[12px] font-medium text-[#8e8e93] bg-white border border-[#e5e5ea] px-3 py-0.5 rounded-full shadow-2xs">
            {payments.length} receipts
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportCSV}
            className="gap-1.5 text-[13px] hidden sm:inline-flex"
          >
            <AppIcon name="square.and.arrow.up" size={14} />
            <span>CSV</span>
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportPDF}
            className="gap-1.5 text-[13px] hidden sm:inline-flex"
          >
            <AppIcon name="printer" size={14} />
            <span>PDF</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onAddPaymentClick}
            className="gap-1.5"
          >
            <AppIcon name="plus" size={16} strokeWidth={2.4} />
            <span>Record Payment</span>
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5e5ea] rounded-[22px] p-5 shadow-xs">
          <div className="text-[12px] font-medium text-[#8e8e93]">Total Collections</div>
          <div className="text-[28px] font-bold text-[#1d1d1f] mt-1 tracking-tight">
            {formatINR(totalCollected)}
          </div>
          <div className="text-[12px] text-[#34c759] mt-0.5 font-medium">
            Active revenue received
          </div>
        </div>

        <div className="bg-white border border-[#e5e5ea] rounded-[22px] p-5 shadow-xs">
          <div className="text-[12px] font-medium text-[#8e8e93]">Total Outstanding</div>
          <div className="text-[28px] font-bold text-[#ff3b30] mt-1 tracking-tight">
            {formatINR(totalOutstanding)}
          </div>
          <div className="text-[12px] text-[#8e8e93] mt-0.5">
            {pendingMembers.length} member{pendingMembers.length === 1 ? '' : 's'} with due balance
          </div>
        </div>

        <div className="bg-white border border-[#e5e5ea] rounded-[22px] p-5 shadow-xs">
          <div className="text-[12px] font-medium text-[#8e8e93]">Payment Transactions</div>
          <div className="text-[28px] font-bold text-[#1d1d1f] mt-1 tracking-tight">
            {payments.length}
          </div>
          <div className="text-[12px] text-[#8e8e93] mt-0.5">
            Across UPI, Cash & Cards
          </div>
        </div>
      </div>

      {/* 3. OUTSTANDING BALANCE CALLOUT */}
      {pendingMembers.length > 0 && (
        <div className="bg-[#fff9f2] border border-[#ffe0b2] rounded-[22px] p-5 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AppIcon name="exclamationmark.circle" size={16} className="text-[#e17100]" />
              <h3 className="text-[14px] font-bold text-[#1d1d1f] tracking-tight">
                Outstanding Fee Balances ({pendingMembers.length})
              </h3>
            </div>
            <span className="text-[13px] font-bold text-[#e17100]">
              Total Due: {formatINR(totalOutstanding)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {pendingMembers.slice(0, 6).map((item) => (
              <div
                key={item.member.id}
                className="bg-white/90 border border-[#f0e0cc] rounded-[16px] p-3.5 flex items-center justify-between shadow-2xs"
              >
                <div>
                  <div className="font-semibold text-[#1d1d1f] text-[13px]">{item.member.name}</div>
                  <div className="text-[11px] text-[#8e8e93] mt-0.5">{item.planName} • <span className="text-[#ff3b30] font-semibold">{formatINR(item.due)} due</span></div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSendPaymentReminder(item)}
                  className="h-7 text-[11px] px-2.5 gap-1 text-[#34c759] border-[#34c759]/30"
                >
                  <AppIcon name="message" size={12} />
                  <span>Remind</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SEARCH & METHOD FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder="Search receipt # or member..."
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-white border border-[#e5e5ea] rounded-full px-4 py-2 text-[13px] text-[#1d1d1f] outline-none focus:border-[#0071e3] transition-all cursor-pointer shadow-2xs"
          >
            <option value="ALL">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#e5e5ea] rounded-full px-4 py-2 text-[13px] text-[#1d1d1f] outline-none focus:border-[#0071e3] transition-all cursor-pointer shadow-2xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* 5. LEDGER TABLE */}
      {isLoading ? (
        <div className="space-y-2">
          <TableRowSkeleton columns={7} />
          <TableRowSkeleton columns={7} />
          <TableRowSkeleton columns={7} />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs overflow-hidden">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-[#f0f0f2] bg-[#fafafc] text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
                  <th className="px-6 py-3.5">Receipt</th>
                  <th className="px-4 py-3.5">Member</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Mode</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f2]">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[#8e8e93]">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-[#fafafc] transition-colors h-[54px]"
                    >
                      <td className="px-6 py-3 font-semibold text-[#0071e3]">
                        {p.receiptNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#1d1d1f]">{p.memberName}</div>
                        <div className="text-[12px] text-[#8e8e93]">{p.memberCode}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#1d1d1f]">
                        {p.status === 'Refunded' ? (
                          <span className="line-through text-[#8e8e93]">{formatINR(p.amount)}</span>
                        ) : (
                          formatINR(p.amount)
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#8e8e93] text-[13px]">
                        {formatDate(p.paymentDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#f2f2f7] border border-[#e5e5ea] text-[#1d1d1f]">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onViewReceiptClick(p)}
                            className="h-7 text-[12px] gap-1 px-2.5 shadow-2xs"
                          >
                            <AppIcon name="doc.text" size={13} />
                            <span>Receipt</span>
                          </Button>

                          <button
                            onClick={(e) => handleShareReceiptWhatsApp(p, e)}
                            title="Share on WhatsApp"
                            className="w-7 h-7 rounded-full bg-[#f2f2f7] hover:bg-[#e8e8ed] text-[#34c759] flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <AppIcon name="message" size={13} />
                          </button>

                          {p.status !== 'Refunded' && canRefund && (
                            <button
                              onClick={() => setPaymentToRefund(p)}
                              title="Refund Payment"
                              className="w-7 h-7 rounded-full bg-[#f2f2f7] hover:bg-[#e8e8ed] text-[#8e8e93] hover:text-[#ff9500] flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <AppIcon name="arrow.counterclockwise" size={13} />
                            </button>
                          )}

                          {isOwner && (
                            <button
                              onClick={() => setPaymentToDelete(p)}
                              title="Delete Record"
                              className="w-7 h-7 rounded-full bg-[#f2f2f7] hover:bg-[#ffe5e5] text-[#8e8e93] hover:text-[#ff3b30] flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <AppIcon name="trash" size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredPayments.length === 0 ? (
              <div className="p-12 text-center text-[#8e8e93] bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
                No payments recorded.
              </div>
            ) : (
              filteredPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-5 bg-white border border-[#e5e5ea] rounded-[22px] space-y-3 shadow-xs"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[12px] text-[#0071e3] font-semibold">{p.receiptNumber}</span>
                      <h4 className="font-bold text-[#1d1d1f] text-[15px] mt-0.5">{p.memberName}</h4>
                      <div className="text-[12px] text-[#8e8e93]">
                        {formatDate(p.paymentDate)} • via {p.paymentMethod}
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-[#f0f0f2]">
                    <div>
                      <span className="text-[11px] text-[#8e8e93] block">Amount</span>
                      <span className="text-lg font-bold text-[#1d1d1f]">
                        {p.status === 'Refunded' ? (
                          <span className="line-through text-[#8e8e93]">{formatINR(p.amount)}</span>
                        ) : (
                          formatINR(p.amount)
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleShareReceiptWhatsApp(p, e)}
                        className="w-8 h-8 rounded-full bg-[#f2f2f7] text-[#34c759] flex items-center justify-center"
                      >
                        <AppIcon name="message" size={14} />
                      </button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onViewReceiptClick(p)}
                        className="h-8 text-[12px] px-3"
                      >
                        Receipt
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Refund Confirmation Dialog */}
      {paymentToRefund && (
        <ConfirmDialog
          isOpen={!!paymentToRefund}
          onClose={() => setPaymentToRefund(null)}
          onConfirm={handleRefundConfirm}
          title="Refund Payment"
          message={`Are you sure you want to refund ${formatINR(paymentToRefund.amount)} for receipt ${paymentToRefund.receiptNumber}?`}
          confirmLabel="Refund"
          isDestructive={false}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {paymentToDelete && (
        <ConfirmDialog
          isOpen={!!paymentToDelete}
          onClose={() => setPaymentToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Payment Record"
          message={`Are you sure you want to delete payment record ${paymentToDelete.receiptNumber}? This will recalculate the member's balance.`}
          confirmLabel="Delete"
        />
      )}
    </div>
  );
};
