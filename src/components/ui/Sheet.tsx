import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppIcon } from './AppIcon';
import { 
  springs, 
  sheetVariants, 
  centeredSheetVariants, 
  backdropVariants 
} from '../../lib/motion';

export interface SheetProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  showCloseButton?: boolean;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  showCloseButton = true,
  headerAction,
  footer,
  className = '',
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  // Keyboard accessibility: Escape to dismiss
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

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
          {/* iOS Translucent Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/40 backdrop-blur-[12px] -webkit-backdrop-blur-[12px] transition-colors"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* iOS Sheet Content Container (Mobile: Bottom Sheet, Desktop: Centered Floating Sheet) */}
          <motion.div
            ref={sheetRef}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{
              hidden: window.innerWidth < 640 ? sheetVariants.hidden : centeredSheetVariants.hidden,
              visible: window.innerWidth < 640 ? sheetVariants.visible : centeredSheetVariants.visible,
              exit: window.innerWidth < 640 ? sheetVariants.exit : centeredSheetVariants.exit,
            }}
            transition={springs.standard}
            className={`relative w-full ${maxWidthClasses[maxWidth]} bg-[#ffffff] border border-[#e0e0e0] sm:border-white/60 sm:shadow-[0_24px_64px_rgba(0,0,0,0.18)] rounded-t-[28px] sm:rounded-[22px] z-10 text-[#1d1d1f] flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden ${className}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Mobile Drag Indicator Handle */}
            <div 
              className="sm:hidden pt-2.5 pb-1.5 flex justify-center cursor-grab active:cursor-grabbing select-none"
              onClick={handleClose}
              title="Swipe or tap to close"
            >
              <div className="w-[36px] h-[5px] rounded-full bg-[#3c3c43]/30" />
            </div>

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[#f0f0f0] bg-[#ffffff] sticky top-0 z-10">
                <div className="min-w-0 pr-2">
                  {title && (
                    <h2 className="text-[17px] sm:text-[18px] font-semibold text-[#1d1d1f] tracking-tight truncate">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-[12px] sm:text-[13px] text-[#86868b] tracking-tight truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {headerAction}
                  {showCloseButton && (
                    <button
                      onClick={handleClose}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f2f2f7] hover:bg-[#e5e5ea] active:scale-95 text-[#86868b] hover:text-[#1d1d1f] flex items-center justify-center transition-all cursor-pointer"
                      aria-label="Close sheet"
                    >
                      <AppIcon name="xmark" size={15} strokeWidth={2.2} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Body */}
            <div className="px-5 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1 overscroll-contain">
              {children}
            </div>

            {/* Optional Footer */}
            {footer && (
              <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-[#f0f0f0] bg-[#fafafc] flex items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
