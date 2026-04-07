/**
 * ConfirmDialog — Radix UI dialog for destructive / important confirmations.
 * Usage:
 *   <ConfirmDialog
 *     trigger={<button>Delete</button>}
 *     title="Delete family?"
 *     description="This cannot be undone."
 *     confirmLabel="Delete"
 *     confirmVariant="danger"
 *     onConfirm={handleDelete}
 *   />
 */
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';

interface Props {
  /** The element that opens the dialog */
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  isPending?: boolean;
  onConfirm: () => void;
  /** Optional additional body content (e.g. notes preview) */
  children?: React.ReactNode;
}

export default function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  isPending = false,
  onConfirm,
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="confirm-overlay" />
        <Dialog.Content className="confirm-dialog" aria-describedby="confirm-desc">
          <Dialog.Title className="confirm-dialog__title">{title}</Dialog.Title>
          <Dialog.Description id="confirm-desc" className="confirm-dialog__desc">
            {description}
          </Dialog.Description>

          {children && <div className="confirm-dialog__body">{children}</div>}

          <div className="confirm-dialog__actions">
            <Dialog.Close asChild>
              <button type="button" className="btn btn--secondary" disabled={isPending}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              className={`btn btn--${confirmVariant}`}
              disabled={isPending}
              onClick={handleConfirm}
            >
              {isPending ? 'Working…' : confirmLabel}
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              className="confirm-dialog__close"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
