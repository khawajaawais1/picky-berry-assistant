import { ActionDialog } from './ActionDialog';

export function ConfirmDialog({
  open,
  title,
  consequence,
  confirmLabel,
  busy = false,
  error = null,
  tone = 'default',
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  consequence: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  tone?: 'danger' | 'primary' | 'default';
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  return (
    <ActionDialog
      open={open}
      title={title}
      consequence={consequence}
      confirmLabel={confirmLabel}
      busy={busy}
      error={error}
      tone={tone}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
