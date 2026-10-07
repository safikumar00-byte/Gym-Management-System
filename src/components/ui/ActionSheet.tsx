import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppIcon, AppIconName } from './AppIcon';
import { springs, actionSheetVariants, backdropVariants } from '../../lib/motion';

export interface ActionSheetOption {
  id: string;
  label: string;
  icon?: AppIconName;
  isDestructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface ActionSheetProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  options: ActionSheetOption[];
  cancelLabel?: string;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  cancelLabel = 'Cancel',
}) => {
  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const regularOptions = options.filter((o) => !o.isDestructive);
  const destructiveOptions = options.filter((o) => o.isDestructive);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/40 backdrop-blur-[10px] -webkit-backdrop-blur-[10px]"
            onClick={handleClose}
          />

          {/* Action Sheet Container */}
          <motion.div
            variants={actionSheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={springs.snappy}
            className="relative w-full max-w-sm sm:max-w-md flex flex-col gap-2.5 z-10 pb-1 sm:pb-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Primary Action Card */}
            <div className="bg-white/95 backdrop-blur-[20px] -webkit-backdrop-blur-[20px] border border-white/60 shadow-[0_12px_40px_rgba(0,0,0,0.15)] rounded-[18px] overflow-hidden divide-y divide-[#f0f0f0]">
              {/* Optional Header Header / Subtitle */}
              {(title || subtitle) && (
                <div className="px-4 py-3 text-center bg-[#fafafc]">
                  {title && (
                    <div className="text-[13px] font-semibold text-[#1d1d1f] tracking-tight">
                      {title}
                    </div>
                  )}
                  {subtitle && (
                    <div className="text-[11px] text-[#86868b] tracking-tight mt-0.5">
                      {subtitle}
                    </div>
                  )}
                </div>
              )}

              {/* Regular actions */}
              {regularOptions.map((opt) => (
                <button
                  key={opt.id}
                  disabled={opt.disabled}
                  onClick={() => {
                    opt.onClick();
                    handleClose();
                  }}
                  className="w-full px-5 py-3.5 min-h-[50px] flex items-center justify-between text-left text-[15px] text-[#0071e3] hover:bg-[#f5f5f7] active:bg-[#e5e5ea] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="font-normal tracking-tight">{opt.label}</span>
                  {opt.icon && (
                    <AppIcon name={opt.icon} size={18} className="text-[#0071e3]" />
                  )}
                </button>
              ))}

              {/* Destructive actions inside group */}
              {destructiveOptions.map((opt) => (
                <button
                  key={opt.id}
                  disabled={opt.disabled}
                  onClick={() => {
                    opt.onClick();
                    handleClose();
                  }}
                  className="w-full px-5 py-3.5 min-h-[50px] flex items-center justify-between text-left text-[15px] text-[#ff3b30] hover:bg-[#fff5f5] active:bg-[#ffe5e5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                >
                  <span className="tracking-tight">{opt.label}</span>
                  {opt.icon && (
                    <AppIcon name={opt.icon} size={18} className="text-[#ff3b30]" />
                  )}
                </button>
              ))}
            </div>

            {/* Cancel Button */}
            <button
              onClick={handleClose}
              className="w-full py-3.5 min-h-[52px] bg-white border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.06)] rounded-[18px] text-[16px] font-semibold text-[#0071e3] hover:bg-[#f5f5f7] active:bg-[#e5e5ea] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center tracking-tight"
            >
              {cancelLabel}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
