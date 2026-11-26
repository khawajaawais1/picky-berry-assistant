import { ActionDialog } from './ActionDialog';

export function ConfirmDialog({
  open,
  title,
  consequence,
  confirmLabel,
  busy = false,
  error = null,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  consequence: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ActionDialog
      open={open}
      title={title}
      consequence={consequence}
      confirmLabel={confirmLabel}
      busy={busy}
      error={error}
      requireReason={false}
      tone="danger"
      onClose={onClose}
      onConfirm={() => onConfirm()}
    />
  );
}
