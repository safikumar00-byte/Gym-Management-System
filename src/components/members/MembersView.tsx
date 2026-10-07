import React, { useState, useMemo, useEffect } from 'react';
import { Member } from '../../types';
import { 
  getMembers, 
  getPlans, 
  getMemberActiveMembership, 
  getPayments, 
  deleteMember,
  getGym
} from '../../lib/storage';
import { formatINR, formatDate, calculatePendingAmount, getWhatsAppUrl } from '../../lib/calculations';
import { exportMembersCSV } from '../../lib/export';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { SearchInput } from '../ui/SearchInput';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ActionSheet, ActionSheetOption } from '../ui/ActionSheet';
import { TableRowSkeleton, MemberCardSkeleton } from '../ui/Skeleton';
import { AppIcon } from '../ui/AppIcon';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useAuth } from '../../context/AuthContext.tsx';

interface MembersViewProps {
  onAddMemberClick: () => void;
  onViewMemberClick: (member: Member) => void;
  onAddPaymentClick: (memberId: string) => void;
  onRenewClick: (member: Member) => void;
  onEditClick: (member: Member) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  onAddMemberClick,
  onViewMemberClick,
  onAddPaymentClick,
  onRenewClick,
  onEditClick,
}) => {
  const { showToast } = useToast();
  const { canDeleteMember, canManagePayments } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [activeActionMember, setActiveActionMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 120);
    return () => clearTimeout(timer);
  }, []);

  const gym = getGym();
  const members = getMembers();
  const plans = getPlans();
  const allPayments = getPayments();

  // Compute enriched member data
  const enrichedMembers = useMemo(() => {
    return members.map((m) => {
      const activeMs = getMemberActiveMembership(m.id);
      let totalFee = 0;
      let totalPaid = 0;
      let pending = 0;
      let planName = '—';
      let startDate = '—';
      let expiryDate = '—';

      if (activeMs) {
        planName = activeMs.planName;
        startDate = activeMs.startDate;
        expiryDate = activeMs.expiryDate;
        totalFee = activeMs.finalAmount;

        const payments = allPayments.filter(
          (p) => p.membershipId === activeMs.id && p.status !== 'Refunded'
        );
        totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        pending = calculatePendingAmount(totalFee, totalPaid);
      }

      return {
        ...m,
        planName,
        startDate,
        expiryDate,
        totalFee,
        totalPaid,
        pending,
      };
    });
  }, [members, allPayments]);

  const filteredMembers = useMemo(() => {
    return enrichedMembers.filter((m) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        m.name.toLowerCase().includes(query) ||
        m.phone.includes(query) ||
        m.memberId.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'ALL' || m.status === statusFilter;

      const matchesPlan =
        planFilter === 'ALL' || m.planName === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [enrichedMembers, searchTerm, statusFilter, planFilter]);

  const handleExportCSV = () => {
    exportMembersCSV(members);
    showToast(`Exported ${members.length} members to CSV`);
  };

  const handleDeleteConfirm = () => {
    if (memberToDelete) {
      deleteMember(memberToDelete.id);
      showToast(`Member ${memberToDelete.name} deleted`);
      setMemberToDelete(null);
    }
  };

  const handleDirectCall = (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  const handleDirectWhatsApp = (member: Member, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const msg = `Hi ${member.name}, greeting from ${gym.name}! Hope your workout sessions are going great.`;
    const url = getWhatsAppUrl(member.phone, msg);
    window.open(url, '_blank');
  };

  const filterTabs = [
    { id: 'ALL', label: 'All', badge: members.length },
    { id: 'ACTIVE', label: 'Active', badge: members.filter(m => m.status === 'ACTIVE').length },
    { id: 'EXPIRING SOON', label: 'Expiring', badge: members.filter(m => m.status === 'EXPIRING SOON').length },
    { id: 'PAYMENT PENDING', label: 'Pending', badge: members.filter(m => m.status === 'PAYMENT PENDING').length },
    { id: 'EXPIRED', label: 'Expired', badge: members.filter(m => m.status === 'EXPIRED').length },
  ];

  // Build Contextual Action Sheet options for the selected member
  const actionSheetOptions: ActionSheetOption[] = activeActionMember
    ? [
        {
          id: 'call',
          label: `Call ${activeActionMember.name} (${activeActionMember.phone})`,
          icon: 'phone',
          onClick: () => handleDirectCall(activeActionMember.phone),
        },
        {
          id: 'whatsapp',
          label: 'Send WhatsApp Message',
          icon: 'message',
          onClick: () => handleDirectWhatsApp(activeActionMember),
        },
        {
          id: 'view',
          label: 'View Member Profile & History',
          icon: 'person',
          onClick: () => onViewMemberClick(activeActionMember),
        },
        ...(canManagePayments
          ? [
              {
                id: 'pay',
                label: 'Collect / Record Payment',
                icon: 'creditcard' as const,
                onClick: () => onAddPaymentClick(activeActionMember.id),
              },
              {
                id: 'renew',
                label: 'Renew Membership Plan',
                icon: 'refresh' as const,
                onClick: () => onRenewClick(activeActionMember),
              },
            ]
          : []),
        {
          id: 'edit',
          label: 'Edit Contact Details',
          icon: 'pencil',
          onClick: () => onEditClick(activeActionMember),
        },
        ...(canDeleteMember
          ? [
              {
                id: 'delete',
                label: 'Delete Member Record',
                icon: 'trash' as const,
                isDestructive: true,
                onClick: () => setMemberToDelete(activeActionMember),
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. TOP HEADER WITH COUNT & PRIMARY ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[26px] sm:text-[30px] font-bold text-[#1d1d1f] tracking-tight">
            Members
          </h2>
          <span className="text-[12px] font-medium text-[#8e8e93] bg-white border border-[#e5e5ea] px-3 py-0.5 rounded-full shadow-2xs">
            {filteredMembers.length} of {members.length}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {canDeleteMember && (
            <Button
              variant="secondary"
              size="md"
              onClick={handleExportCSV}
              className="gap-1.5 text-[13px] hidden sm:inline-flex"
            >
              <AppIcon name="square.and.arrow.up" size={15} strokeWidth={2} />
              <span>Export CSV</span>
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={onAddMemberClick}
            className="gap-1.5"
          >
            <AppIcon name="plus" size={16} strokeWidth={2.4} />
            <span>Add Member</span>
          </Button>
        </div>
      </div>

      {/* 2. FILTER SEGMENTED CONTROLS & SEARCH TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Apple Segmented Control */}
        <div className="overflow-x-auto pb-1 no-scrollbar">
          <SegmentedControl
            options={filterTabs}
            value={statusFilter}
            onChange={setStatusFilter}
            size="md"
          />
        </div>

        {/* Search & Plan Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="w-full md:w-72">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              placeholder="Search by name, ID, phone..."
            />
          </div>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-white border border-[#e5e5ea] text-[#1d1d1f] text-[13px] rounded-full px-3.5 py-2 outline-none focus:border-[#0071e3] transition-colors cursor-pointer shadow-2xs"
          >
            <option value="ALL">All Plans</option>
            {plans.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. MEMBERS LIST / TABLE */}
      {isLoading ? (
        <div className="space-y-3">
          <MemberCardSkeleton />
          <MemberCardSkeleton />
          <MemberCardSkeleton />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white border border-[#e5e5ea] rounded-[24px] p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#f2f2f7] text-[#8e8e93] flex items-center justify-center mb-3">
            <AppIcon name="person.2" size={24} />
          </div>
          <div className="text-[17px] font-semibold text-[#1d1d1f]">No Members Found</div>
          <p className="text-[13px] text-[#8e8e93] mt-1 max-w-sm">
            Try adjusting your search criteria or filter tabs to locate members.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e5ea] rounded-[24px] shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-[#f0f0f2] bg-[#fafafc] text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
                  <th className="py-3.5 px-6">Member</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Plan & Expiry</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Balance</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f2]">
                {filteredMembers.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => onViewMemberClick(m)}
                    className="hover:bg-[#fafafc] active:bg-[#f2f2f7] cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-semibold text-[13px] flex items-center justify-center shrink-0">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-[#1d1d1f] tracking-tight">{m.name}</div>
                          <div className="text-[12px] text-[#8e8e93]">{m.memberId}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[13px] text-[#1d1d1f]">{m.phone}</div>
                      <div className="text-[11px] text-[#8e8e93] truncate max-w-[140px]">{m.email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[13px] font-medium text-[#1d1d1f]">{m.planName}</div>
                      <div className="text-[12px] text-[#8e8e93]">Exp: {m.expiryDate !== '—' ? formatDate(m.expiryDate) : '—'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4">
                      {m.pending > 0 ? (
                        <div>
                          <div className="text-[13px] font-semibold text-[#ff3b30]">{formatINR(m.pending)}</div>
                          <div className="text-[11px] text-[#8e8e93]">Pending</div>
                        </div>
                      ) : (
                        <span className="text-[12px] text-[#34c759] font-medium">Cleared</span>
                      )}
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveActionMember(m)}
                          className="w-8 h-8 rounded-full bg-[#f2f2f7] hover:bg-[#eaeaee] text-[#1d1d1f] flex items-center justify-center transition-colors cursor-pointer"
                          title="Actions"
                        >
                          <AppIcon name="ellipsis" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Grouped Rows View */}
          <div className="lg:hidden divide-y divide-[#f0f0f2]">
            {filteredMembers.map((m) => (
              <div
                key={m.id}
                onClick={() => onViewMemberClick(m)}
                className="p-4 flex items-center justify-between gap-3 active:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-semibold text-[14px] flex items-center justify-center shrink-0">
                    {m.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[#1d1d1f] text-[15px] truncate">
                      {m.name}
                    </div>
                    <div className="text-[12px] text-[#8e8e93] truncate">
                      {m.planName} • {m.phone}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={m.status} size="sm" />
                      {m.pending > 0 && (
                        <span className="text-[11px] font-semibold text-[#ff3b30]">
                          Due: {formatINR(m.pending)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setActiveActionMember(m)}
                    className="w-8 h-8 rounded-full bg-[#f2f2f7] hover:bg-[#eaeaee] text-[#1d1d1f] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <AppIcon name="ellipsis" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Action Sheet for Member */}
      <ActionSheet
        isOpen={!!activeActionMember}
        onClose={() => setActiveActionMember(null)}
        title={activeActionMember?.name}
        subtitle={`${activeActionMember?.memberId} • ${activeActionMember?.planName || ''}`}
        options={actionSheetOptions}
      />

      {/* Delete Confirmation Sheet */}
      <ConfirmDialog
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Member"
        message={`Are you sure you want to delete ${memberToDelete?.name}? This action cannot be undone and will permanently remove their records.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
      />
    </div>
  );
};
