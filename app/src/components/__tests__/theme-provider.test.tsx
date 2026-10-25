import { Appearance, Platform, Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

import { AppThemeProvider } from '../theme-provider';

/**
 * The app's theme, resolved once and handed down.
 *
 * `react-native-web`'s `useColorScheme` starts from the browser's answer, while the static export
 * is pre-rendered light: on a cold load the first client render disagreed with the HTML, the
 * browser kept parts of the server tree, and the components that never re-rendered — the core
 * navigation above all — stayed light in dark mode (frontend review, 2026-10-25).
 *
 * The provider starts light on the web (the paint the HTML already made), then applies the real
 * system answer after mount, so every consumer re-renders together.
 */
function Probe() {
  const theme = useAppTheme();

  return <Text testID="scheme">{theme.scheme}</Text>;
}

describe('AppThemeProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('applies the system’s dark scheme after the first client render on the web', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');

    await render(
      <AppThemeProvider>
        <Probe />
      </AppThemeProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('scheme')).toHaveTextContent('dark'));
  });

  it('keeps the light scheme when the system asks for light', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');

    await render(
      <AppThemeProvider>
        <Probe />
      </AppThemeProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('scheme')).toHaveTextContent('light'));
  });

  it('hands the theme down to every consumer, not one subtree', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');

    await render(
      <AppThemeProvider>
        <Probe />
        <Probe />
      </AppThemeProvider>,
    );

    await waitFor(() => {
      for (const node of screen.getAllByTestId('scheme')) {
        expect(node).toHaveTextContent('dark');
      }
    });
  });
});
