import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AppIcon } from './AppIcon';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
}) => {
  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    } else if (typeof onCancel === 'function') {
      onCancel();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="sm" showCloseButton={false}>
      <div className="flex flex-col gap-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5 text-[14px] text-[#86868b] leading-relaxed">
          {isDestructive && (
            <div className="w-10 h-10 rounded-full bg-[#ff3b30]/12 text-[#ff3b30] flex items-center justify-center shrink-0">
              <AppIcon name="exclamationmark.circle" size={20} strokeWidth={2} />
            </div>
          )}
          <p className="flex-1 text-[#1d1d1f] text-[14px] sm:text-[15px]">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#f0f0f0]">
          <Button variant="secondary" size="md" onClick={handleClose} className="flex-1 sm:flex-initial">
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'primary'}
            size="md"
            className="flex-1 sm:flex-initial"
            onClick={() => {
              onConfirm();
              handleClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
