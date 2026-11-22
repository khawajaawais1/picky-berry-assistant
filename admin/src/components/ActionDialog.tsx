import { useEffect, useId, useRef, useState } from 'react';
import { Button, Field } from './ui';

export function ActionDialog({
  open,
  title,
  consequence,
  confirmLabel,
  reasonLabel = 'Reason',
  reasonHint = 'This is written to the audit log.',
  requireReason = true,
  tone = 'danger',
  busy = false,
  error = null,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  consequence: string;
  confirmLabel: string;
  reasonLabel?: string;
  reasonHint?: string;
  requireReason?: boolean;
  tone?: 'danger' | 'primary' | 'default';
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setReason('');
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href]',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const reasonReady = !requireReason || reason.trim().length >= 3;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="dialog-head">
          <div>
            <p className="eyebrow">Privileged action</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <Button
            className="small ghost"
            aria-label="Close dialog"
            disabled={busy}
            onClick={onClose}
          >
            Close
          </Button>
        </div>

        <p id={descriptionId} className="dialog-consequence">
          {consequence}
        </p>

        {requireReason ? (
          <Field label={reasonLabel} htmlFor={reasonId} hint={reasonHint}>
            <textarea
              ref={inputRef}
              id={reasonId}
              value={reason}
              rows={3}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain what you observed and why this action is needed."
            />
          </Field>
        ) : null}

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="dialog-actions">
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : tone === 'primary' ? 'primary' : 'default'}
            loading={busy}
            disabled={!reasonReady}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
