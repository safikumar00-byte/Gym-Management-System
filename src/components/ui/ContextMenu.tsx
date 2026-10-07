import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppIcon, AppIconName } from './AppIcon';
import { springs, popoverVariants } from '../../lib/motion';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: AppIconName;
  shortcut?: string;
  isDestructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  isOpen: boolean;
  onClose?: () => void;
  items: ContextMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  onClose,
  items,
  align = 'right',
  className = '',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          variants={popoverVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={springs.snappy}
          className={`absolute top-full mt-1.5 z-40 w-52 bg-white/95 backdrop-blur-[24px] -webkit-backdrop-blur-[24px] border border-white/80 shadow-[0_10px_32px_rgba(0,0,0,0.12)] rounded-[14px] p-1 divide-y divide-[#f0f0f0] overflow-hidden ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${className}`}
        >
          <div className="py-0.5 space-y-0.5">
            {items.map((item) => (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick();
                  handleClose();
                }}
                className={`w-full min-h-[38px] px-3 py-1.5 rounded-[9px] flex items-center justify-between text-[13px] tracking-tight transition-colors cursor-pointer select-none ${
                  item.isDestructive
                    ? 'text-[#ff3b30] hover:bg-[#fff5f5] active:bg-[#ffe5e5]'
                    : 'text-[#1d1d1f] hover:bg-[#0071e3] hover:text-white group'
                } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {item.icon && (
                    <AppIcon
                      name={item.icon}
                      size={15}
                      className={
                        item.isDestructive
                          ? 'text-[#ff3b30]'
                          : 'text-[#86868b] group-hover:text-white'
                      }
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-[11px] text-[#86868b] group-hover:text-white/80 pl-2">
                    {item.shortcut}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
