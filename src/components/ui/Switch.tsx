import React from 'react';
import { motion } from 'motion/react';
import { springs } from '../../lib/motion';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  id,
  className = '',
}) => {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center justify-between gap-3 select-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      {(label || description) && (
        <div className="flex flex-col min-w-0 pr-2">
          {label && (
            <span className="text-[14px] font-medium text-[#1d1d1f] tracking-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[12px] text-[#86868b] tracking-tight">
              {description}
            </span>
          )}
        </div>
      )}

      {/* iOS 51x31px Toggle Track */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        id={id}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 ${
          checked ? 'bg-[#34c759]' : 'bg-[#e9e9eb]'
        }`}
      >
        {/* Sliding 27x27px White Thumb */}
        <motion.span
          animate={{ x: checked ? 22 : 2 }}
          transition={springs.snappy}
          className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)]"
        />
      </button>
    </label>
  );
};
