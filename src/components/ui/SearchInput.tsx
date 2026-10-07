import React from 'react';
import { AppIcon } from './AppIcon';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  containerClassName = '',
  ...props
}) => {
  return (
    <div className={`relative flex items-center w-full ${containerClassName}`}>
      <div className="absolute left-3.5 text-[#8e8e93] pointer-events-none flex items-center justify-center">
        <AppIcon name="magnifyingglass" size={16} strokeWidth={2.2} />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-[#e3e3e8]/60 hover:bg-[#e3e3e8]/80 focus:bg-white text-[#1d1d1f] placeholder-[#8e8e93] text-[14px] border border-transparent focus:border-[#0071e3] rounded-full pl-10 pr-9 py-2 min-h-[38px] transition-all duration-150 outline-none focus:ring-2 focus:ring-[#0071e3]/20 ${className}`}
        {...props}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 w-4 h-4 rounded-full bg-[#8e8e93] text-white hover:bg-[#636366] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <AppIcon name="xmark" size={10} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};
