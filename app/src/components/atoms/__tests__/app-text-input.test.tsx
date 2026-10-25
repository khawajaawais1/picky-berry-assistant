import { fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { layout, radii, spacing, themes, typography } from '@/constants/theme';

import { AppTextInput } from '../app-text-input';

/**
 * Frame 03's “Input” component, node 5:22788: 342x54, 10 px radius, 14 px inset,
 * 16/22 value, 20 px accessory on the right.
 */
describe('AppTextInput', () => {
  it('renders its value and reports typing', async () => {
    const onChangeText = jest.fn();
    await render(
      <AppTextInput
        accessibilityLabel="Email address"
        onChangeText={onChangeText}
        value="aino@example.fi"
      />,
    );

    expect(screen.getByDisplayValue('aino@example.fi')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByDisplayValue('aino@example.fi'), 'aino@example.se');
    expect(onChangeText).toHaveBeenCalledWith('aino@example.se');
  });

  it('shows a placeholder hint when empty', async () => {
    await render(
      <AppTextInput
        accessibilityLabel="Your name"
        onChangeText={() => {}}
        placeholder="Aino"
        value=""
      />,
    );

    expect(screen.getByPlaceholderText('Aino')).toBeOnTheScreen();
  });

  it('uses the design’s control metrics', async () => {
    await render(
      <AppTextInput
        accessibilityLabel="Your name"
        onChangeText={() => {}}
        testID="field-name"
        value=""
      />,
    );

    expect(screen.getByTestId('field-name')).toHaveStyle({
      backgroundColor: themes.light.colors.surface,
      borderColor: themes.light.colors.border,
      borderRadius: radii.control,
      // The design's 54 px control, as a floor: the value inside grows with the system text
      // size, and a field that kept the frame's height would clip it (ADR-019).
      minHeight: layout.actionHeight,
      paddingBottom: spacing.field,
      paddingLeft: spacing.field,
      paddingRight: spacing.field,
      paddingTop: spacing.field,
    });
  });

  it('takes the height a screen gives it, without a second field component', async () => {
    // Frame 06's search field is 50 px where the foundations' inputs are 54, and it is still
    // one text input: the app has exactly one, and it takes the frame's metric as a floor.
    await render(
      <AppTextInput
        accessibilityLabel="Search a place or zone"
        height={layout.searchHeight}
        onChangeText={() => {}}
        testID="field-search"
        value=""
      />,
    );

    expect(screen.getByTestId('field-search')).toHaveStyle({ minHeight: layout.searchHeight });
  });

  it('gives the value the design’s body metrics and the theme’s text colour', async () => {
    await render(
      <AppTextInput accessibilityLabel="Your name" onChangeText={() => {}} value="Aino" />,
    );

    expect(screen.getByLabelText('Your name')).toHaveStyle({
      color: themes.light.colors.text,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
    });
  });

  it('renders an accessory inside the field, after the value', async () => {
    await render(
      <AppTextInput
        accessibilityLabel="Email address"
        accessory={<View testID="field-accessory" />}
        onChangeText={() => {}}
        value=""
      />,
    );

    expect(screen.getByTestId('field-accessory')).toBeOnTheScreen();
  });

  it('renders a leading glyph before the value, which the field does not act on', async () => {
    await render(
      <AppTextInput
        accessibilityLabel="Search a place or zone"
        leading={<View testID="field-leading" />}
        onChangeText={() => {}}
        value=""
      />,
    );

    const field = screen.getByTestId('field-leading').parent;

    expect(screen.getByTestId('field-leading')).toBeOnTheScreen();
    // Before the input in the row, not after it: the magnifier sits at the frame's own left inset.
    expect(field?.children[0]).toBe(screen.getByTestId('field-leading'));
  });
});
