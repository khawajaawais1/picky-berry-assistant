import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout } from '@/constants/theme';

import { FieldAction } from '../field-action';

/**
 * The reveal control inside a password field (sign-in, create account). It is a 20 px glyph
 * wrapped in the smallest box a finger can aim at, so the target does not depend on the icon's
 * size (AGENTS.md §11; frontend review 2026-10-25).
 */
describe('FieldAction', () => {
  it('reaches the 44 px target with hit slop, not with a taller field', async () => {
    const onPress = jest.fn();
    await render(
      <FieldAction accessibilityLabel="Show password" onPress={onPress} testID="reveal">
        <></>
      </FieldAction>,
    );

    const control = screen.getByRole('button', { name: 'Show password' });

    expect(control).toBeOnTheScreen();
    // The glyph is 20 px; 12 px of slop on each side is the 44 px target. The visual box stays the
    // glyph's size, so it cannot stretch the 54 px field around it.
    expect(control.props.hitSlop).toBe((layout.minTouchTarget - 20) / 2);
    expect(control).not.toHaveStyle({ height: layout.minTouchTarget });
  });

  it('fires the press it is given', async () => {
    const onPress = jest.fn();
    await render(
      <FieldAction accessibilityLabel="Show password" onPress={onPress}>
        <></>
      </FieldAction>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
