import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout } from '@/constants/theme';

import { FieldAction } from '../field-action';

/**
 * The reveal control inside a password field (sign-in, create account). It is a 20 px glyph
 * wrapped in the smallest box a finger can aim at, so the target does not depend on the icon's
 * size (AGENTS.md §11; frontend review 2026-10-25).
 */
describe('FieldAction', () => {
  it('is a labelled 44 px button', async () => {
    const onPress = jest.fn();
    await render(
      <FieldAction accessibilityLabel="Show password" onPress={onPress} testID="reveal">
        <></>
      </FieldAction>,
    );

    const control = screen.getByRole('button', { name: 'Show password' });

    expect(control).toBeOnTheScreen();
    expect(control).toHaveStyle({
      height: layout.minTouchTarget,
      width: layout.minTouchTarget,
    });
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
