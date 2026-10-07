import React from 'react';
import { motion } from 'motion/react';
import { springs } from '../../lib/motion';

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  badge?: number | string;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
  id = 'segmented-control',
}: SegmentedControlProps<T>) {
  const sizeStyles = {
    sm: 'p-0.5 text-[12px] h-7',
    md: 'p-1 text-[13px] h-9',
    lg: 'p-1 text-[14px] h-10',
  };

  const itemPadding = {
    sm: 'px-2.5 py-0.5',
    md: 'px-3.5 py-1',
    lg: 'px-4 py-1.5',
  };

  return (
    <div
      id={id}
      role="tablist"
      className={`inline-flex items-center bg-[#767680]/12 p-0.5 rounded-[10px] select-none ${sizeStyles[size]} ${className}`}
    >
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={isSelected}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`relative flex-1 ${itemPadding[size]} rounded-[8px] font-medium tracking-tight transition-colors duration-150 flex items-center justify-center gap-1.5 z-10 cursor-pointer whitespace-nowrap ${
              isSelected
                ? 'text-[#1d1d1f]'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId={`segment-pill-${id}`}
                transition={springs.snappy}
                className="absolute inset-0 bg-white rounded-[8px] shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)] -z-10"
              />
            )}
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? 'bg-[#0071e3] text-white font-semibold'
                    : 'bg-[#86868b]/20 text-[#86868b]'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
