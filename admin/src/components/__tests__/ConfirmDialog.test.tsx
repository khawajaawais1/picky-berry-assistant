import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('confirms immediately without asking for a reason', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Recompute scores"
        consequence="Every zone score is requeued."
        confirmLabel="Recompute"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.queryByLabelText(/reason/i)).not.toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Recompute' });
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape without confirming', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Requeue job"
        consequence="A copy is enqueued."
        confirmLabel="Requeue"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
