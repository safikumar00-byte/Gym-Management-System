import React from 'react';
import { AppIcon, AppIconName } from './AppIcon';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: AppIconName;
  trend?: string;
  isAccent?: boolean;
  isDestructive?: boolean;
  isWarning?: boolean;
  isSuccess?: boolean;
  className?: string;
  onClick?: () => void;
  id?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  icon,
  trend,
  isAccent = false,
  isDestructive = false,
  isWarning = false,
  isSuccess = false,
  className = '',
  onClick,
  id,
}) => {
  let valueColor = 'text-[#1d1d1f]';
  let badgeBg = 'bg-[#f2f2f7] text-[#86868b]';

  if (isAccent) {
    valueColor = 'text-[#0071e3]';
    badgeBg = 'bg-[#0071e3]/10 text-[#0071e3]';
  } else if (isDestructive) {
    valueColor = 'text-[#ff3b30]';
    badgeBg = 'bg-[#ff3b30]/10 text-[#ff3b30]';
  } else if (isWarning) {
    valueColor = 'text-[#ff9500]';
    badgeBg = 'bg-[#ff9500]/10 text-[#ff9500]';
  } else if (isSuccess) {
    valueColor = 'text-[#34c759]';
    badgeBg = 'bg-[#34c759]/10 text-[#34c759]';
  }

  return (
    <div
      id={id}
      onClick={onClick}
      className={`p-4 sm:p-5 bg-white border border-[#e5e5ea] rounded-[20px] shadow-xs flex flex-col justify-between transition-all duration-150 ${
        onClick
          ? 'cursor-pointer hover:border-[#c7c7cc] active:scale-[0.97] active:bg-[#fafafc]'
          : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[13px] font-medium tracking-tight text-[#8e8e93]">
          {label}
        </span>
        {icon && (
          <div className={`w-7 h-7 rounded-[9px] ${badgeBg} flex items-center justify-center shrink-0`}>
            <AppIcon name={icon} size={15} strokeWidth={2} />
          </div>
        )}
      </div>

      <div className={`text-[26px] sm:text-[30px] font-semibold tracking-tight ${valueColor} leading-none my-1`}>
        {value}
      </div>

      {(subValue || trend) && (
        <div className="mt-2 flex items-center gap-1.5 text-[12px] font-normal text-[#8e8e93] tracking-tight">
          {trend && (
            <span className="font-semibold text-[#34c759] flex items-center gap-0.5">
              <AppIcon name="chart.line.uptrend" size={12} strokeWidth={2.4} />
              {trend}
            </span>
          )}
          {subValue && <span>{subValue}</span>}
        </div>
      )}
    </div>
  );
};
