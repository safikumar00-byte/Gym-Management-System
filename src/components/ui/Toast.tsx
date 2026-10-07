import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppIcon } from './AppIcon';
import { springs } from '../../lib/motion';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = 'toast-' + Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Floating Pill Center Notification Area - Above Mobile Tab Bar */}
      <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 max-w-[92vw] sm:max-w-md w-full pointer-events-none px-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={springs.snappy}
              className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 bg-white/90 backdrop-blur-[24px] -webkit-backdrop-blur-[24px] border border-white/60 text-[13px] sm:text-[14px] text-[#1d1d1f] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] select-none w-fit max-w-full"
            >
              {toast.type === 'success' && (
                <div className="w-5 h-5 rounded-full bg-[#34c759]/15 text-[#34c759] flex items-center justify-center shrink-0">
                  <AppIcon name="checkmark" size={13} strokeWidth={2.4} />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="w-5 h-5 rounded-full bg-[#ff3b30]/15 text-[#ff3b30] flex items-center justify-center shrink-0">
                  <AppIcon name="xmark" size={13} strokeWidth={2.4} />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="w-5 h-5 rounded-full bg-[#0071e3]/15 text-[#0071e3] flex items-center justify-center shrink-0">
                  <AppIcon name="info.circle" size={13} strokeWidth={2.4} />
                </div>
              )}

              <span className="font-medium tracking-tight truncate max-w-[280px] sm:max-w-xs">
                {toast.message}
              </span>

              <button
                onClick={() => removeToast(toast.id)}
                className="w-5 h-5 rounded-full hover:bg-black/5 text-[#86868b] hover:text-[#1d1d1f] flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
                aria-label="Dismiss toast"
              >
                <AppIcon name="xmark" size={11} strokeWidth={2.4} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
