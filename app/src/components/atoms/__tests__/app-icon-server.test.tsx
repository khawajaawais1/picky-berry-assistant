import { render, screen } from '@testing-library/react-native';

import { Feather } from '../app-icon';

jest.mock('react', () => {
  const actual = jest.requireActual<typeof import('react')>('react');

  return {
    ...actual,
    useSyncExternalStore: ((_subscribe: unknown, _getSnapshot: unknown, server: () => unknown) =>
      server()) as typeof actual.useSyncExternalStore,
  };
});

/**
 * The server snapshot is the empty box the static export paints; the first hydrated pass uses it
 * too, and only then does the icon arrive. Without this test the branch is never rendered.
 */
describe('AppIcon on the server snapshot', () => {
  it('draws the icon-sized placeholder', async () => {
    await render(<Feather color="#414BA0" name="bell" size={22} testID="bell" />);

    expect(screen.getByTestId('bell')).toHaveStyle({ height: 22, width: 22 });
  });

  it('uses 24 px when the caller gave no size', async () => {
    await render(<Feather color="#414BA0" name="bell" testID="bell" />);

    expect(screen.getByTestId('bell')).toHaveStyle({ height: 24, width: 24 });
  });
});
