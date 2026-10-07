import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-[13px] font-medium text-[#1d1d1f] tracking-tight">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-[#86868b] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-[#f2f2f7] hover:bg-[#ebebed] text-[#1d1d1f] placeholder-[#8e8e93] text-[15px] border ${
              error
                ? 'border-[#ff3b30] bg-[#fff5f5] focus:ring-[#ff3b30]/30'
                : 'border-transparent focus:border-[#0071e3] focus:bg-white focus:ring-3 focus:ring-[#0071e3]/20'
            } rounded-[12px] min-h-[44px] sm:min-h-[46px] py-2.5 ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } ${
              rightIcon ? 'pr-10' : 'pr-3.5'
            } transition-all duration-150 outline-none disabled:opacity-50 disabled:bg-[#e5e5ea] ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-[#86868b] flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <span className="text-[12px] text-[#ff3b30] font-medium tracking-tight">{error}</span>
        ) : helperText ? (
          <span className="text-[12px] text-[#86868b] tracking-tight">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
