import { render, screen } from '@testing-library/react-native';

import { Feather } from '../app-icon';

/**
 * The wrapper stands in for `@expo/vector-icons`; on a client (the test environment) it must render
 * the icon exactly as the library would. The server snapshot is the empty box, which is what makes
 * the icon arrive after hydration instead of in the middle of it (frontend review, 2026-10-25).
 */
describe('AppIcon', () => {
  it('renders the icon the caller asked for', async () => {
    await render(<Feather color="#414BA0" name="bell" size={22} testID="bell" />);

    expect(screen.getByTestId('bell')).toBeOnTheScreen();
  });
});
