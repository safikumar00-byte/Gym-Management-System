import React from 'react';
import { MemberStatus, PaymentStatus } from '../../types';

interface StatusBadgeProps {
  status: MemberStatus | PaymentStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const norm = String(status || '').toUpperCase();

  let dotColor = 'bg-[#86868b]';
  let textColor = 'text-[#1d1d1f]';
  let bgColor = 'bg-[#f5f5f7]';

  if (norm === 'ACTIVE' || norm === 'PAID') {
    dotColor = 'bg-[#34c759]';
    textColor = 'text-[#1d1d1f]';
    bgColor = 'bg-[#34c759]/10';
  } else if (norm === 'PAYMENT PENDING' || norm === 'PARTIAL' || norm === 'PENDING') {
    dotColor = 'bg-[#ff9500]';
    textColor = 'text-[#1d1d1f]';
    bgColor = 'bg-[#ff9500]/10';
  } else if (norm === 'EXPIRING SOON' || norm === 'EXPIRING') {
    dotColor = 'bg-[#ff9500]';
    textColor = 'text-[#1d1d1f]';
    bgColor = 'bg-[#ff9500]/10';
  } else if (norm === 'EXPIRED') {
    dotColor = 'bg-[#ff3b30]';
    textColor = 'text-[#1d1d1f]';
    bgColor = 'bg-[#ff3b30]/10';
  } else if (norm === 'REFUNDED') {
    dotColor = 'bg-[#86868b]';
    textColor = 'text-[#86868b]';
    bgColor = 'bg-[#f5f5f7]';
  }

  const padding = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-[13px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-normal tracking-tight ${bgColor} ${textColor} ${padding} rounded-full`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} inline-block shrink-0`} />
      <span className="capitalize">{norm.toLowerCase()}</span>
    </span>
  );
};

