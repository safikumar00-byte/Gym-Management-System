import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`py-16 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto ${className}`}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[#f5f5f7] text-[#86868b] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight mb-1.5">
        {title}
      </h3>
      <p className="text-[14px] text-[#86868b] leading-relaxed mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
