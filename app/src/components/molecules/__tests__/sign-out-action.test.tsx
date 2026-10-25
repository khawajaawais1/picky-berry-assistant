import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SignOutAction } from '../sign-out-action';

/**
 * Signing out deletes the saved plan, the reports waiting to sync and the consent record from this
 * phone (`src/services/sign-out.ts`). In a field app the queue has no other copy, so the action is
 * one press away from data loss and has to say what it deletes before it does it (frontend review,
 * 2026-10-25).
 */
describe('SignOutAction', () => {
  it('offers the action without doing anything until it is confirmed', async () => {
    const onSignOut = jest.fn(async () => {});
    await render(<SignOutAction onSignOut={onSignOut} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(onSignOut).not.toHaveBeenCalled();
    expect(screen.getByText('Sign out of this phone?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Signing out deletes the saved spots, the visit reports waiting to sync and your consent record from this phone. They cannot be recovered here.',
      ),
    ).toBeOnTheScreen();
  });

  it('announces the confirmation when it opens', async () => {
    await render(<SignOutAction onSignOut={async () => {}} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    // The block appears because of the press, so it is a status a screen reader has to hear.
    expect(screen.getByText('Sign out of this phone?').props.role).toBe('status');
  });

  it('lets the user keep the session instead', async () => {
    const onSignOut = jest.fn(async () => {});
    await render(<SignOutAction onSignOut={onSignOut} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Keep me signed in' }));

    expect(onSignOut).not.toHaveBeenCalled();
    expect(screen.queryByText('Sign out of this phone?')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeOnTheScreen();
  });

  it('signs out once confirmed, and blocks a second press while it works', async () => {
    let finish: () => void = () => {};
    const onSignOut = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await render(<SignOutAction onSignOut={onSignOut} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    const confirm = screen.getByRole('button', { name: 'Sign out and delete' });

    await fireEvent.press(confirm);

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(confirm).toBeDisabled();
    expect(confirm.props.accessibilityState).toMatchObject({ busy: true, disabled: true });

    await fireEvent.press(confirm);
    expect(onSignOut).toHaveBeenCalledTimes(1);

    finish();
    await waitFor(() => expect(confirm).not.toBeDisabled());
  });

  it('reports a sign-out that failed, and lets the user try again', async () => {
    let attempts = 0;
    const onSignOut = jest.fn(async () => {
      attempts += 1;

      if (attempts === 1) {
        throw new Error('the queue could not be cleared');
      }
    });
    await render(<SignOutAction onSignOut={onSignOut} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out and delete' }));

    const failure = await screen.findByText(
      'Signing out did not finish. Some records may still be here; try again.',
    );
    expect(failure.props.role).toBe('status');
    // The records are still on the phone, so the confirmation stays open rather than pretending
    // the first attempt succeeded.
    expect(screen.getByText('Sign out of this phone?')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out and delete' }));
    expect(onSignOut).toHaveBeenCalledTimes(2);
  });
});
