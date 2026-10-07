import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'dark' | 'tinted';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium tracking-tight select-none focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 active:scale-[0.96] active:opacity-90';

  const sizeStyles = {
    sm: 'text-[12px] px-3.5 py-1.5 min-h-[34px] gap-1.5 rounded-full',
    md: 'text-[14px] px-4.5 py-2 min-h-[42px] sm:min-h-[40px] gap-2 rounded-full',
    lg: 'text-[15px] px-6 py-2.5 min-h-[48px] gap-2.5 rounded-full',
  };

  const variantStyles = {
    primary:
      'bg-[#0071e3] text-white hover:bg-[#0077ed] active:bg-[#0062c4] shadow-xs border border-transparent',
    secondary:
      'bg-white text-[#1d1d1f] border border-[#e0e0e0] hover:bg-[#f5f5f7] hover:border-[#d2d2d7] shadow-2xs',
    tinted:
      'bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/15 active:bg-[#0071e3]/20 border border-transparent',
    outline:
      'bg-transparent text-[#0071e3] border border-[#0071e3]/40 hover:bg-[#0071e3]/5',
    destructive:
      'bg-[#ff3b30] text-white hover:bg-[#ff453a] active:bg-[#d70015] shadow-xs border border-transparent',
    dark:
      'bg-[#1c1c1e] text-white hover:bg-[#2c2c2e] active:bg-[#000000] rounded-[10px]',
    ghost:
      'bg-transparent text-[#1d1d1f] hover:bg-[#767680]/10',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
          <span>Processing...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
