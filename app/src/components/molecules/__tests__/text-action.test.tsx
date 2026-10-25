import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, themes, typography } from '@/constants/theme';

import { TextAction } from '../text-action';

/**
 * The design's secondary actions are text links (screens 01, 03 and 04). They were
 * written twice before this one moved them here, which is the repository's rule for a
 * shared component (AGENTS.md §2.5).
 */
describe('TextAction', () => {
  it('is a labelled button when it can act', async () => {
    const onPress = jest.fn();
    await render(<TextAction label="Change email address" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Change email address' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('claims no role when it cannot act, so the screen is never announced with a dead action', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(
      <TextAction label="Change email address" onPress={onPress} />,
    );

    expect(screen.getByRole('button', { name: 'Change email address' })).toBeOnTheScreen();

    await rerender(<TextAction label="Change email address" />);

    expect(screen.queryByRole('button', { name: 'Change email address' })).not.toBeOnTheScreen();
    expect(screen.getByText('Change email address')).toBeOnTheScreen();
  });

  it('is a tab stop only while it can act', async () => {
    // The web target gives every `Pressable` `tabIndex = disabled ? -1 : 0`, so an action waiting
    // on a countdown — frame 15's own count line, which the marketplace renders without a
    // destination — was reachable by keyboard and did nothing on arrival. Found by the
    // accessibility-tree walk (e2e/accessibility.spec.ts); held here, where the prop is visible.
    const { rerender } = await render(
      <TextAction label="Browse 12 local listings" onPress={() => {}} testID="count" />,
    );

    expect(screen.getByTestId('count').props.tabIndex).toBe(0);

    await rerender(<TextAction label="Browse 12 local listings" testID="count" />);

    expect(screen.getByTestId('count').props.tabIndex).toBe(-1);
  });

  it('uses the design’s accent semibold copy', async () => {
    await render(<TextAction label="Resend code" onPress={() => {}} />);

    expect(screen.getByText('Resend code')).toHaveStyle({
      color: themes.light.colors.accent,
      fontWeight: '600',
    });
  });

  it('centres its label across the column when the frame does', async () => {
    await render(<TextAction align="center" label="Resend code" onPress={() => {}} />);

    // The frame centres screen 04's two text actions across the content column and sets
    // screen 03's terms link against the column's start.
    expect(screen.getByText('Resend code').parent).toHaveStyle({ alignItems: 'center' });
    expect(screen.getByText('Resend code').parent).toHaveStyle({ width: '100%' });
  });

  it('takes the metric its frame gives it', async () => {
    await render(<TextAction label="Read terms & privacy" onPress={() => {}} variant="caption" />);

    expect(screen.getByText('Read terms & privacy')).toHaveStyle({
      fontSize: typography.caption.fontSize,
    });
  });

  it('grows its 20 px label into the 44 px target a finger needs', async () => {
    // The label is the design's 20 px line, but the control around it was only as tall as the
    // text. AGENTS.md §11 asks for a 44 px target, and a full-width 20 px row is easy to miss.
    await render(<TextAction label="Forgot password?" onPress={() => {}} testID="forgot" />);

    expect(screen.getByTestId('forgot')).toHaveStyle({
      justifyContent: 'center',
      minHeight: layout.minTouchTarget,
    });
  });
});
