import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  hideClose?: boolean;
  dismissOnBackdrop?: boolean;
  // When true, the modal fills the entire viewport and its body scrolls, with
  // the header and footer pinned. Used for long multi-step flows.
  fullScreen?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  hideClose = false,
  dismissOnBackdrop = true,
  fullScreen = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center bg-black/70 backdrop-blur-sm animate-fade-in',
        fullScreen ? 'items-stretch' : 'items-end sm:items-center',
      )}
      onClick={dismissOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'border border-border-default bg-bg-surface shadow-card animate-slide-up',
          fullScreen
            ? 'flex h-full w-full max-w-none flex-col rounded-none border-0'
            : 'w-full max-w-md rounded-t-3xl sm:rounded-2xl',
          className,
        )}
        onClick={(e) => { e.stopPropagation(); }}
      >
        {(title !== undefined || !hideClose) && (
          <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
            <h3 className="text-base font-semibold">{title}</h3>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-elevated hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className={cn('px-5 py-5', fullScreen && 'flex-1 overflow-y-auto')}>{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
