import React from 'react';
import { AppIcon, AppIconName } from './AppIcon';

export interface ListRowProps {
  leading?: React.ReactNode;
  icon?: AppIconName;
  iconColor?: string;
  iconBg?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  value?: string | number;
  onClick?: () => void;
  showChevron?: boolean;
  isDestructive?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  leading,
  icon,
  iconColor = '#0071e3',
  iconBg = 'bg-[#f5f9ff]',
  title,
  subtitle,
  trailing,
  value,
  onClick,
  showChevron = true,
  isDestructive = false,
  disabled = false,
  className = '',
  id,
}) => {
  const isClickable = !!onClick && !disabled;

  return (
    <div
      id={id}
      onClick={isClickable ? onClick : undefined}
      className={`min-h-[54px] sm:min-h-[58px] px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors duration-100 ${
        isClickable ? 'cursor-pointer hover:bg-[#f5f5f7] active:bg-[#e8e8ed]' : ''
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {/* Leading Icon or Avatar */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {leading ? (
          <div className="shrink-0">{leading}</div>
        ) : icon ? (
          <div
            className={`w-9 h-9 rounded-[10px] ${iconBg} flex items-center justify-center shrink-0 border border-black/5`}
          >
            <AppIcon name={icon} size={18} color={iconColor} strokeWidth={2} />
          </div>
        ) : null}

        {/* Text Content */}
        <div className="min-w-0 flex-1">
          <div
            className={`text-[15px] font-normal tracking-tight truncate ${
              isDestructive ? 'text-[#ff3b30] font-medium' : 'text-[#1d1d1f]'
            }`}
          >
            {title}
          </div>
          {subtitle && (
            <div className="text-[12px] text-[#86868b] tracking-tight truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Trailing Section */}
      <div className="flex items-center gap-2 shrink-0">
        {value !== undefined && (
          <span className="text-[14px] text-[#86868b] font-normal tracking-tight">
            {value}
          </span>
        )}
        {trailing}
        {showChevron && isClickable && (
          <AppIcon
            name="chevron.right"
            size={14}
            className="text-[#c7c7cc]"
            strokeWidth={2.4}
          />
        )}
      </div>
    </div>
  );
};

export interface GroupedListProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  inset?: boolean;
}

export const GroupedList: React.FC<GroupedListProps> = ({
  header,
  footer,
  children,
  className = '',
  inset = true,
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Section Header */}
      {header && (
        <div className="px-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
          {header}
        </div>
      )}

      {/* Group Container with Inset or Full Border */}
      <div
        className={`bg-white border border-[#e5e5ea] overflow-hidden divide-y divide-[#f0f0f0] ${
          inset ? 'rounded-[16px] shadow-xs' : 'rounded-none border-x-0'
        }`}
      >
        {children}
      </div>

      {/* Section Footer */}
      {footer && (
        <div className="px-4 text-[12px] text-[#86868b] tracking-tight leading-relaxed">
          {footer}
        </div>
      )}
    </div>
  );
};
