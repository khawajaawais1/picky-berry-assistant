import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { radii, spacing, themes, typography } from '@/constants/theme';

import { Callout } from '../callout';

/**
 * Screen 03's “Status message”, node 5:22788: a success-tinted 342x87 block, 10 px
 * radius, 14 px inset, 12 px gap, with its title and body stacked 3 px apart.
 */
describe('Callout', () => {
  it('renders its title, body and icon', async () => {
    await render(
      <Callout icon={<View testID="callout-icon" />} title="Your data stays yours">
        Saved spots default to private.
      </Callout>,
    );

    expect(screen.getByText('Your data stays yours')).toBeOnTheScreen();
    expect(screen.getByText('Saved spots default to private.')).toBeOnTheScreen();
    expect(screen.getByTestId('callout-icon')).toBeOnTheScreen();
  });

  it('uses the design’s success-tinted surface and control radius', async () => {
    await render(
      <Callout testID="privacy-note" title="Your data stays yours">
        Saved spots default to private.
      </Callout>,
    );

    expect(screen.getByTestId('privacy-note')).toHaveStyle({
      backgroundColor: themes.light.colors.successMuted,
      borderRadius: radii.control,
      paddingBottom: spacing.field,
      paddingLeft: spacing.field,
      paddingRight: spacing.field,
      paddingTop: spacing.field,
    });
  });

  it('paints the accent tint when the frame gives the note an accent surface', async () => {
    // Screen 04's note about the phone path (node 5:22840) sits on the accent tint, where
    // screen 03's privacy note sits on the success one.
    await render(
      <Callout testID="phone-note" title="Signed up by phone instead?" tone="accent">
        The same verification step uses a code sent by SMS.
      </Callout>,
    );

    expect(screen.getByTestId('phone-note')).toHaveStyle({
      backgroundColor: themes.light.colors.accentMuted,
      borderRadius: radii.control,
    });
  });

  it('keeps its title in the design’s semibold body metrics and its body muted', async () => {
    await render(<Callout title="Your data stays yours">Saved spots default to private.</Callout>);

    expect(screen.getByText('Your data stays yours')).toHaveStyle({
      fontSize: typography.bodySmall.fontSize,
      fontWeight: '600',
    });
    expect(screen.getByText('Saved spots default to private.')).toHaveStyle({
      color: themes.light.colors.textMuted,
      fontSize: typography.caption.fontSize,
    });
  });
});
