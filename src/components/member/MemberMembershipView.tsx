import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertCircle, 
  ArrowUpRight,
  ShieldCheck,
  Download,
  Receipt
} from 'lucide-react';
import { MemberReceiptModal } from './MemberReceiptModal';

export const MemberMembershipView: React.FC = () => {
  const { gym } = useAuth();
  const { showToast } = useToast();

  const [membershipData, setMembershipData] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const fetchMembershipAndPayments = async () => {
    try {
      setLoading(true);
      const [mRes, pRes] = await Promise.all([
        api.getMemberMembership(),
        api.getMemberPayments(),
      ]);
      setMembershipData(mRes);
      setPayments(pRes);
    } catch (err: any) {
      showToast(err.message || 'Failed to load membership data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembershipAndPayments();
  }, []);

  const activePlan = membershipData?.active;
  const historyPlans = membershipData?.history || [];

  const currencySymbol = gym?.currency === 'INR' ? '₹' : (gym?.currency || '₹');

  // Calculate days remaining
  let daysRemaining = 0;
  let isExpired = false;
  if (activePlan) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(activePlan.endDate);
    end.setHours(0, 0, 0, 0);
    daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) {
      daysRemaining = 0;
      isExpired = true;
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs">
        <span className="text-[11px] font-semibold text-[#86868b] tracking-wider uppercase">
          MEMBERSHIP & BILLING
        </span>
        <h1 className="text-[24px] font-bold text-[#1d1d1f] tracking-tight mt-0.5">
          Subscription & Receipts
        </h1>
        <p className="text-[13px] text-[#6e6e73]">
          Manage your active membership validity and download verified payment receipts.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-[#86868b] text-[13px]">
          Loading membership status...
        </div>
      ) : (
        <>
          {/* Active Plan Card */}
          {activePlan ? (
            <div className="bg-gradient-to-br from-[#1d1d1f] to-[#2c2c2e] text-white p-6 rounded-[24px] shadow-sm relative overflow-hidden space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-white/10 text-white/90 backdrop-blur-md mb-2">
                    <ShieldCheck size={12} className="text-[#34c759]" /> CURRENT SUBSCRIPTION
                  </span>
                  <h2 className="text-[22px] font-bold tracking-tight">
                    {activePlan.planName}
                  </h2>
                  <p className="text-[13px] text-white/70 mt-0.5">
                    Plan Price: {currencySymbol}{parseFloat(activePlan.price || '0').toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="flex flex-col sm:items-end">
                  <span className={`px-3 py-1 rounded-full text-[12px] font-semibold tracking-wide border ${
                    isExpired
                      ? 'bg-[#ff3b30]/20 text-[#ff453a] border-[#ff3b30]/40'
                      : 'bg-[#34c759]/20 text-[#32d74b] border-[#34c759]/40'
                  }`}>
                    {isExpired ? 'EXPIRED' : (activePlan.status || 'ACTIVE')}
                  </span>
                </div>
              </div>

              {/* Validity timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="bg-white/5 p-3.5 rounded-[16px] border border-white/10">
                  <span className="text-[11px] text-white/60 block font-medium">START DATE</span>
                  <span className="text-[14px] font-semibold text-white mt-1 block">
                    {new Date(activePlan.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <div className="bg-white/5 p-3.5 rounded-[16px] border border-white/10">
                  <span className="text-[11px] text-white/60 block font-medium">END DATE</span>
                  <span className="text-[14px] font-semibold text-white mt-1 block">
                    {new Date(activePlan.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <div className="bg-white/5 p-3.5 rounded-[16px] border border-white/10">
                  <span className="text-[11px] text-white/60 block font-medium">VALIDITY REMAINING</span>
                  <span className="text-[18px] font-bold text-[#ff9f0a] mt-0.5 block">
                    {daysRemaining} Days
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-[24px] border border-[#e5e5ea] text-center space-y-2">
              <CreditCard size={32} className="text-[#86868b] mx-auto" />
              <p className="text-[16px] font-bold text-[#1d1d1f]">No Active Membership</p>
              <p className="text-[13px] text-[#86868b] max-w-sm mx-auto">
                You do not have an active membership pass. Please visit the front desk to subscribe or renew.
              </p>
            </div>
          )}

          {/* Payment Receipts & Transaction History */}
          <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-[#1d1d1f]">Payment Receipts</h3>
                <p className="text-[12px] text-[#86868b]">Download and view verified invoices</p>
              </div>
              <span className="text-[12px] text-[#86868b] font-medium">
                {payments.length} transactions
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="py-8 text-center text-[#86868b] text-[13px]">
                No payment receipts on file yet.
              </div>
            ) : (
              <div className="divide-y divide-[#f0f0f2]">
                {payments.map(payment => (
                  <div
                    key={payment.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fafafc] px-3 rounded-[14px] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f4fcf6] border border-[#34c759]/20 flex items-center justify-center text-[#34c759]">
                        <Receipt size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[14px] text-[#1d1d1f]">
                            {payment.receiptNumber}
                          </span>
                          <span className="text-[11px] font-medium bg-[#f5f5f7] px-2 py-0.5 rounded-full text-[#6e6e73]">
                            {payment.paymentMethod || 'UPI'}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#86868b]">
                          {new Date(payment.paymentDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="sm:text-right">
                        <span className="font-bold text-[15px] text-[#1d1d1f] block">
                          {currencySymbol}{parseFloat(payment.amount || '0').toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-[#34c759] font-medium">Verified Paid</span>
                      </div>

                      <button
                        onClick={() => setSelectedReceipt(payment)}
                        className="px-3.5 py-1.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#0071e3] font-semibold text-[12px] rounded-full transition-all flex items-center gap-1.5 cursor-pointer border border-[#e5e5ea]"
                      >
                        <FileText size={13} />
                        <span>View Invoice</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Membership History */}
          {historyPlans.length > 1 && (
            <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs space-y-3">
              <h3 className="text-[16px] font-bold text-[#1d1d1f]">Past Memberships</h3>
              <div className="divide-y divide-[#f0f0f2]">
                {historyPlans.slice(1).map(hp => (
                  <div key={hp.id} className="py-3 flex items-center justify-between text-[13px]">
                    <div>
                      <div className="font-semibold text-[#1d1d1f]">{hp.planName}</div>
                      <div className="text-[12px] text-[#86868b]">
                        {new Date(hp.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })} — {new Date(hp.endDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <span className="text-[12px] text-[#86868b] bg-[#f5f5f7] px-2.5 py-0.5 rounded-full">
                      Archived
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal for Invoice View */}
      <MemberReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        payment={selectedReceipt}
        member={membershipData?.active ? { name: activePlan?.memberName || 'Gym Member', memberCode: activePlan?.memberCode || 'GM-001' } : null}
      />
    </div>
  );
};
