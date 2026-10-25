import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorScreen } from '../error-screen';

/**
 * What a screen shows when it throws instead of rendering. The app had no boundary at all, so a
 * render error in production fell through to the router's default. The fallback may not print the
 * error itself: an error message can carry a path, an address or a store key.
 */
describe('ErrorScreen', () => {
  it('names the state and offers both ways out', async () => {
    const onHome = jest.fn();
    const onRetry = jest.fn();

    await render(
      <ErrorScreen
        error={new Error('boom: /Users/aino/secret')}
        onHome={onHome}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('header', { name: 'This screen hit a problem' })).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Nothing was lost: your saved spots and reports are still on this phone. Try again, or go back.',
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  it('does not print the error it was given', async () => {
    await render(<ErrorScreen error={new Error('boom: a secret value')} onHome={() => {}} />);

    // The message is not copy: it can carry a path, an address or a store key.
    expect(screen.queryByText(/boom/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/secret/)).not.toBeOnTheScreen();
  });

  it('leaves retry out when the router offered none', async () => {
    await render(<ErrorScreen error={new Error('boom')} onHome={() => {}} />);

    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeOnTheScreen();
  });
});
