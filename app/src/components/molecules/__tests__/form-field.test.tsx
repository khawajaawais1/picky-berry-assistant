import { fireEvent, render, screen } from '@testing-library/react-native';

import { themes, typography } from '@/constants/theme';

import { FormField } from '../form-field';

/** Screen 03's “Field label” + “Input” pair, node 5:22788. */
describe('FormField', () => {
  it('labels the input it renders', async () => {
    await render(
      <FormField label="Your name" onChangeText={() => {}} testID="field-name" value="" />,
    );

    expect(screen.getByText('Your name')).toBeOnTheScreen();
    expect(screen.getByLabelText('Your name')).toBeOnTheScreen();
  });

  it('gives the label the design’s 14 px semibold metrics', async () => {
    await render(<FormField label="Your name" onChangeText={() => {}} value="" />);

    expect(screen.getByText('Your name')).toHaveStyle({
      fontSize: 14,
      fontWeight: '600',
      lineHeight: typography.bodySmall.lineHeight,
    });
  });

  it('reports typing through to the caller', async () => {
    const onChangeText = jest.fn();
    await render(<FormField label="Your name" onChangeText={onChangeText} value="Aino" />);

    await fireEvent.changeText(screen.getByLabelText('Your name'), 'Aino Korhonen');

    expect(onChangeText).toHaveBeenCalledWith('Aino Korhonen');
  });

  it('passes the placeholder and secure entry through to the input', async () => {
    await render(
      <FormField
        label="Password"
        onChangeText={() => {}}
        placeholder="••••••••"
        secureTextEntry
        value=""
      />,
    );

    expect(screen.getByPlaceholderText('••••••••')).toBeOnTheScreen();
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  it('renders an accessory inside its input', async () => {
    await render(
      <FormField
        accessory={<></>}
        label="Email address"
        onChangeText={() => {}}
        testID="field-identifier"
        value=""
      />,
    );

    expect(screen.getByTestId('field-identifier')).toHaveStyle({
      borderColor: themes.light.colors.border,
    });
  });
});
