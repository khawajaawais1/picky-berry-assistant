import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionDialog } from '../ActionDialog';

describe('ActionDialog', () => {
  it('states the consequence and requires a reason before confirming', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ActionDialog
        open
        title="Revoke sessions"
        consequence="All 3 active sessions for picker@example.com will stop refreshing."
        confirmLabel="Revoke sessions"
        reasonLabel="Why are you revoking these sessions?"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByText(/all 3 active sessions/i),
    ).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Revoke sessions' });
    expect(confirm).toBeDisabled();

    await user.type(
      screen.getByLabelText(/why are you revoking/i),
      '  suspected compromise  ',
    );
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(onConfirm).toHaveBeenCalledWith('suspected compromise');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape and does not confirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ActionDialog
        open
        title="Change role"
        consequence="The account will gain every admin route."
        confirmLabel="Change role"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows a server error and blocks a second submit while busy', () => {
    render(
      <ActionDialog
        open
        busy
        title="Revoke sessions"
        consequence="All active sessions will stop refreshing."
        confirmLabel="Revoke sessions"
        error="The API refused this request (request req-1)."
        onClose={() => undefined}
        onConfirm={() => undefined}
        requireReason={false}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/api refused/i);
    expect(
      screen.getByRole('button', { name: 'Working…' }),
    ).toBeDisabled();
  });
});
