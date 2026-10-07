import React, { useState, useEffect, useMemo } from 'react';
import { Sheet } from '../ui/Sheet';
import { AppIcon } from '../ui/AppIcon';
import { getMembers, getPayments } from '../../lib/storage';
import { formatINR, formatDate } from '../../lib/calculations';
import { Member, Payment } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMember: (member: Member) => void;
  onSelectReceipt: (payment: Payment) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMember,
  onSelectReceipt,
}) => {
  const [query, setQuery] = useState('');
  const members = getMembers();
  const payments = getPayments();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return {
        matchedMembers: members.slice(0, 4),
        matchedPayments: payments.slice(0, 4),
        isRecent: true,
      };
    }
    const q = query.toLowerCase();
    const matchedMembers = members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          m.memberId.toLowerCase().includes(q)
      )
      .slice(0, 6);

    const matchedPayments = payments
      .filter(
        (p) =>
          p.receiptNumber.toLowerCase().includes(q) ||
          p.memberName.toLowerCase().includes(q) ||
          p.paymentMethod.toLowerCase().includes(q)
      )
      .slice(0, 6);

    return { matchedMembers, matchedPayments, isRecent: false };
  }, [query, members, payments]);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Spotlight Search"
      subtitle="Quick search members, contact phone, or receipts"
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        {/* Spotlight Big Search Field */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8e8e93] pointer-events-none flex items-center justify-center">
            <AppIcon name="magnifyingglass" size={20} strokeWidth={2.2} />
          </div>
          <input
            type="text"
            placeholder="Type a member name, phone, or receipt number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-[#f2f2f7] hover:bg-[#ebebed] focus:bg-white text-[#1d1d1f] text-[16px] sm:text-[17px] border border-transparent focus:border-[#0071e3] rounded-[16px] outline-none focus:ring-4 focus:ring-[#0071e3]/15 transition-all placeholder-[#8e8e93] tracking-tight"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#8e8e93] text-white hover:bg-[#636366] flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Clear"
            >
              <AppIcon name="xmark" size={12} strokeWidth={2.4} />
            </button>
          )}
        </div>

        {/* Section: Members */}
        <div>
          <div className="flex items-center justify-between text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 px-1">
            <span>
              {results.isRecent ? 'Recent Members' : `Members (${results.matchedMembers.length})`}
            </span>
            <span className="text-[11px] normal-case text-[#8e8e93]">
              Press to open profile
            </span>
          </div>

          {results.matchedMembers.length === 0 ? (
            <div className="text-[#8e8e93] py-4 text-center text-[13px] bg-[#f9f9fb] rounded-[14px]">
              No members matched "{query}"
            </div>
          ) : (
            <div className="divide-y divide-[#f0f0f0] border border-[#e5e5ea] rounded-[16px] overflow-hidden bg-white shadow-2xs">
              {results.matchedMembers.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    onClose();
                    onSelectMember(m);
                  }}
                  className="p-3.5 sm:px-4 min-h-[58px] flex items-center justify-between hover:bg-[#f5f5f7] active:bg-[#eaeaee] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-semibold text-[13px] flex items-center justify-center shrink-0">
                      {m.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-[#1d1d1f] tracking-tight truncate">
                        {m.name}
                      </div>
                      <div className="text-[12px] text-[#8e8e93] tracking-tight truncate">
                        {m.phone} • {m.memberId}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={m.status} size="sm" />
                    <AppIcon name="chevron.right" size={14} className="text-[#c7c7cc]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Receipts / Billing */}
        <div>
          <div className="flex items-center justify-between text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 px-1">
            <span>
              {results.isRecent ? 'Recent Receipts' : `Receipts (${results.matchedPayments.length})`}
            </span>
            <span className="text-[11px] normal-case text-[#8e8e93]">
              Press to view receipt
            </span>
          </div>

          {results.matchedPayments.length === 0 ? (
            <div className="text-[#8e8e93] py-4 text-center text-[13px] bg-[#f9f9fb] rounded-[14px]">
              No payment receipts found
            </div>
          ) : (
            <div className="divide-y divide-[#f0f0f0] border border-[#e5e5ea] rounded-[16px] overflow-hidden bg-white shadow-2xs">
              {results.matchedPayments.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onClose();
                    onSelectReceipt(p);
                  }}
                  className="p-3.5 sm:px-4 min-h-[58px] flex items-center justify-between hover:bg-[#f5f5f7] active:bg-[#eaeaee] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[10px] bg-[#34c759]/10 text-[#34c759] flex items-center justify-center shrink-0">
                      <AppIcon name="receipt" size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-[#1d1d1f] tracking-tight truncate">
                        {p.memberName}
                      </div>
                      <div className="text-[12px] text-[#8e8e93] tracking-tight truncate">
                        {p.receiptNumber} • {formatDate(p.paymentDate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[14px] font-semibold text-[#1d1d1f] tracking-tight">
                      {formatINR(p.amount)}
                    </span>
                    <AppIcon name="chevron.right" size={14} className="text-[#c7c7cc]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
};
