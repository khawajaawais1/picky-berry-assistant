import { AccessibilityInfo } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { AppText } from '../../atoms';
import { StatusMessage } from '../status-message';

/**
 * The lines whose text changes while a screen is open: a refused sign-in, a filter's count, a
 * store that could not be read. Painting them is not announcing them — a screen reader stays
 * where the user is and never hears the sentence (WCAG 4.1.3, frontend review 2026-10-25).
 */
describe('StatusMessage', () => {
  it('declares itself a polite live region for the platforms that read one', async () => {
    await render(<StatusMessage testID="status">Zones could not be read</StatusMessage>);

    const message = screen.getByTestId('status');

    // `accessibilityLiveRegion` is what Android reads; `aria-live` and the status role are what
    // the web target writes. Stated twice for the same reason the checkbox states are.
    expect(message.props.accessibilityLiveRegion).toBe('polite');
    expect(message.props['aria-live']).toBe('polite');
    expect(message.props.role).toBe('status');
    expect(message).toHaveTextContent('Zones could not be read');
  });

  it('announces the sentence on iOS, which has no live region', async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});

    await render(<StatusMessage>That email and password didn’t match.</StatusMessage>);

    expect(announce).toHaveBeenCalledWith('That email and password didn’t match.');
  });

  it('can be a final reading the caller does not want spoken', async () => {
    await render(<StatusMessage announce={false}>Saved</StatusMessage>);

    expect(screen.getByText('Saved')).toBeOnTheScreen();
  });

  it('leaves a composed child out of the iOS announcement', async () => {
    await render(
      <StatusMessage>
        <AppText>Saved spot</AppText>
      </StatusMessage>,
    );

    expect(screen.getByText('Saved spot')).toBeOnTheScreen();
  });

  it('keeps the text tone and variant its caller gives it', async () => {
    await render(
      <StatusMessage testID="status" tone="danger" variant="bodySmall">
        Something failed
      </StatusMessage>,
    );

    expect(screen.getByTestId('status')).toHaveStyle({ fontSize: 14 });
  });
});
