import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { SegmentedControl } from '../ui/SegmentedControl';
import { AppIcon } from '../ui/AppIcon';
import { Member, Payment, Gym } from '../../types';
import { 
  getMemberActiveMembership, 
  getMemberMembershipHistory, 
  getPayments, 
  getGym 
} from '../../lib/storage';
import { formatINR, formatDate, calculatePendingAmount, getWhatsAppUrl } from '../../lib/calculations';
import { ReceiptModal } from '../payments/ReceiptModal';
import { api } from '../../lib/api';

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onAddPayment: (memberId: string) => void;
  onRenewMembership: (member: Member) => void;
  onEditMember: (member: Member) => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  isOpen,
  onClose,
  member,
  onAddPayment,
  onRenewMembership,
  onEditMember,
}) => {
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'history'>('overview');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const gym: Gym = getGym();

  const activeMembership = useMemo(() => {
    if (!member) return null;
    return getMemberActiveMembership(member.id);
  }, [member]);

  const membershipHistory = useMemo(() => {
    if (!member) return [];
    return getMemberMembershipHistory(member.id);
  }, [member]);

  const payments = useMemo(() => {
    if (!member) return [];
    return getPayments()
      .filter((p) => p.memberId === member.id)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [member]);

  const financialStats = useMemo(() => {
    if (!activeMembership) return { totalFee: 0, paid: 0, pending: 0 };
    const paid = payments
      .filter((p) => p.membershipId === activeMembership.id && p.status !== 'Refunded')
      .reduce((sum, p) => sum + p.amount, 0);
    const pending = calculatePendingAmount(activeMembership.finalAmount, paid);
    return {
      totalFee: activeMembership.finalAmount,
      paid,
      pending,
    };
  }, [activeMembership, payments]);

  if (!member) return null;

  const handleCall = () => {
    window.location.href = `tel:${member.phone}`;
  };

  const handleWhatsApp = () => {
    const msg = `Hi ${member.name}, greeting from ${gym.name}! Hope you are enjoying your sessions.`;
    window.open(getWhatsAppUrl(member.phone, msg), '_blank');
  };

  const handleGenerateInvite = async () => {
    try {
      setIsInviting(true);
      const res = await api.inviteMember(member.id);
      setInviteToken(res.invitationToken);
      const inviteMsg = `Hi ${member.name}! Access your ${gym.name} Member Portal with your digital pass, check-in, workouts & invoices: Use code ${res.invitationToken}`;
      window.open(getWhatsAppUrl(member.phone, inviteMsg), '_blank');
    } catch (err: any) {
      console.error('Failed to generate invite', err);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !selectedReceiptPayment}
        onClose={onClose}
        title="Member Profile"
        subtitle={`${member.memberId} • Joined ${formatDate(member.joinedDate)}`}
        maxWidth="2xl"
      >
        <div className="flex flex-col gap-5">
          {/* Header Profile Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f0f0f2]">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center font-bold text-[20px] shrink-0">
                {member.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[20px] font-bold text-[#1d1d1f] tracking-tight">
                    {member.name}
                  </h3>
                  <StatusBadge status={member.status} />
                </div>
                <div className="text-[13px] text-[#8e8e93] mt-0.5">
                  {member.memberId} • {member.phone}
                </div>
              </div>
            </div>

            {/* Direct Communication & Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleCall}
                className="w-9 h-9 rounded-full bg-[#f2f2f7] hover:bg-[#eaeaee] text-[#1d1d1f] flex items-center justify-center transition-colors cursor-pointer"
                title="Call phone"
              >
                <AppIcon name="phone" size={16} />
              </button>
              <button
                onClick={handleWhatsApp}
                className="w-9 h-9 rounded-full bg-[#34c759]/10 hover:bg-[#34c759]/20 text-[#34c759] flex items-center justify-center transition-colors cursor-pointer"
                title="WhatsApp message"
              >
                <AppIcon name="message" size={16} />
              </button>
              <button
                onClick={handleGenerateInvite}
                disabled={isInviting}
                className="px-3 py-1.5 bg-[#f0f4ff] hover:bg-[#e1ecff] text-[#0071e3] rounded-full text-[12px] font-semibold transition-all cursor-pointer border border-[#0071e3]/20 flex items-center gap-1"
                title="Generate Member App Code & WhatsApp link"
              >
                <span>{isInviting ? 'Inviting...' : '📱 Invite App'}</span>
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onAddPayment(member.id);
                }}
              >
                + Payment
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onRenewMembership(member);
                }}
              >
                Renew
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEditMember(member);
                }}
              >
                Edit
              </Button>
            </div>
          </div>

          {inviteToken && (
            <div className="p-3.5 bg-[#f0f4ff] border border-[#0071e3]/30 rounded-[16px] flex items-center justify-between text-[13px]">
              <div>
                <span className="font-semibold text-[#0071e3] block text-[11px] uppercase tracking-wider">Member App Onboarding Code</span>
                <span className="font-mono font-bold text-[16px] text-[#1d1d1f] tracking-widest">{inviteToken}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteToken);
                }}
                className="px-3.5 py-1.5 bg-white border border-[#0071e3]/30 text-[#0071e3] font-semibold rounded-full text-[12px] hover:bg-[#f5f9ff] cursor-pointer"
              >
                Copy Code
              </button>
            </div>
          )}

          {/* Segmented Tab Bar */}
          <SegmentedControl<'overview' | 'payments' | 'history'>
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { id: 'overview', label: 'Overview' },
              { id: 'payments', label: 'Payments', badge: payments.length },
              { id: 'history', label: 'History', badge: membershipHistory.length },
            ]}
            size="md"
          />

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Active Plan Card */}
              <div className="p-4 sm:p-5 bg-[#fafafc] border border-[#e5e5ea] rounded-[18px] space-y-3.5">
                <div className="flex justify-between items-center">
                  <div className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
                    Active Plan
                  </div>
                  <span className="text-[15px] font-bold text-[#1d1d1f]">
                    {activeMembership?.planName || 'No Active Membership'}
                  </span>
                </div>

                {activeMembership ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-[#f0f0f2]">
                    <div>
                      <div className="text-[11px] text-[#8e8e93]">Start Date</div>
                      <div className="text-[14px] font-semibold text-[#1d1d1f] mt-0.5">
                        {formatDate(activeMembership.startDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#8e8e93]">Expiry Date</div>
                      <div className="text-[14px] font-semibold text-[#1d1d1f] mt-0.5">
                        {formatDate(activeMembership.expiryDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#8e8e93]">Total Fee</div>
                      <div className="text-[14px] font-bold text-[#1d1d1f] mt-0.5">
                        {formatINR(financialStats.totalFee)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#8e8e93]">Balance</div>
                      <div className={`text-[14px] font-bold mt-0.5 ${
                        financialStats.pending > 0 ? 'text-[#ff3b30]' : 'text-[#34c759]'
                      }`}>
                        {financialStats.pending === 0 ? 'Settled' : formatINR(financialStats.pending)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-[#8e8e93]">
                    Member does not have an active membership. Click Renew to assign a plan.
                  </p>
                )}
              </div>

              {/* Personal Information */}
              <div className="p-4 sm:p-5 bg-white border border-[#e5e5ea] rounded-[18px] space-y-3">
                <div className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
                  Contact & Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-[13.5px]">
                  <div className="flex items-center gap-2.5">
                    <AppIcon name="phone" size={15} className="text-[#8e8e93]" />
                    <span className="text-[#8e8e93]">Phone:</span>
                    <span className="text-[#1d1d1f] font-medium">{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <AppIcon name="envelope" size={15} className="text-[#8e8e93]" />
                    <span className="text-[#8e8e93]">Email:</span>
                    <span className="text-[#1d1d1f] truncate">{member.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <AppIcon name="person" size={15} className="text-[#8e8e93]" />
                    <span className="text-[#8e8e93]">Gender:</span>
                    <span className="text-[#1d1d1f]">{member.gender}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <AppIcon name="calendar" size={15} className="text-[#8e8e93]" />
                    <span className="text-[#8e8e93]">DOB:</span>
                    <span className="text-[#1d1d1f]">{member.dateOfBirth ? formatDate(member.dateOfBirth) : '—'}</span>
                  </div>
                  <div className="flex items-start gap-2.5 sm:col-span-2">
                    <AppIcon name="house" size={15} className="text-[#8e8e93] shrink-0 mt-0.5" />
                    <span className="text-[#8e8e93]">Address:</span>
                    <span className="text-[#1d1d1f]">{member.address || '—'}</span>
                  </div>
                  {member.emergencyContact && (
                    <div className="flex items-center gap-2.5 sm:col-span-2">
                      <AppIcon name="exclamationmark.circle" size={15} className="text-[#ff9500]" />
                      <span className="text-[#8e8e93]">Emergency:</span>
                      <span className="text-[#1d1d1f] font-medium">{member.emergencyContact}</span>
                    </div>
                  )}
                  {member.notes && (
                    <div className="sm:col-span-2 pt-2 border-t border-[#f0f0f2]">
                      <div className="text-[11px] text-[#8e8e93] mb-0.5">Notes</div>
                      <div className="text-[#1d1d1f] italic text-[13px]">{member.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="border border-[#e5e5ea] rounded-[18px] overflow-hidden bg-white">
              {payments.length === 0 ? (
                <div className="p-8 text-center text-[#8e8e93] text-[13px]">
                  No payments recorded for this member.
                </div>
              ) : (
                <div className="divide-y divide-[#f0f0f2]">
                  {payments.map((p) => (
                    <div key={p.id} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-[#fafafc] transition-colors">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-[#1d1d1f] text-[15px]">
                            {formatINR(p.amount)}
                          </span>
                          <span className="text-[11px] text-[#0071e3] font-semibold bg-[#0071e3]/10 px-2 py-0.5 rounded-full">
                            {p.receiptNumber}
                          </span>
                          <span className="text-[12px] text-[#8e8e93]">
                            via {p.paymentMethod}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#8e8e93] mt-1">
                          {formatDate(p.paymentDate)} {p.notes ? `• ${p.notes}` : ''}
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedReceiptPayment(p)}
                        className="gap-1.5 text-[12px]"
                      >
                        <AppIcon name="receipt" size={13} />
                        <span>Receipt</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PLAN HISTORY */}
          {activeTab === 'history' && (
            <div className="border border-[#e5e5ea] rounded-[18px] overflow-hidden bg-white">
              {membershipHistory.length === 0 ? (
                <div className="p-8 text-center text-[#8e8e93] text-[13px]">
                  No past memberships archived.
                </div>
              ) : (
                <div className="divide-y divide-[#f0f0f2]">
                  {membershipHistory.map((m) => (
                    <div key={m.id} className="p-3.5 sm:p-4 flex items-center justify-between text-[14px]">
                      <div>
                        <span className="font-semibold text-[#1d1d1f]">{m.planName}</span>
                        <div className="text-[12px] text-[#8e8e93] mt-0.5">
                          {formatDate(m.startDate)} — {formatDate(m.expiryDate)}
                        </div>
                      </div>
                      <span className="font-bold text-[#1d1d1f]">{formatINR(m.finalAmount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Receipt Modal from Member Profile */}
      {selectedReceiptPayment && (
        <ReceiptModal
          isOpen={!!selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
          payment={selectedReceiptPayment}
          member={member}
          membership={activeMembership}
          gym={gym}
        />
      )}
    </>
  );
};
