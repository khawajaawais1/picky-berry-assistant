import { fireEvent, render, screen } from '@testing-library/react-native';

import { themes } from '@/constants/theme';

import { AppCheckbox } from '../app-checkbox';

/** Screen 03's consent control: a 22 px square-check glyph, node 5:22788. */
describe('AppCheckbox', () => {
  it('toggles from the sentence beside it, not only from the glyph', async () => {
    // A consent row is read as one control: the words a user reads are the words they press.
    // The 22 px glyph alone was the only way to consent (frontend review, 2026-10-25).
    const onChange = jest.fn();
    await render(
      <AppCheckbox
        accessibilityLabel="I agree to the terms"
        checked={false}
        label="I agree to the terms"
        onChange={onChange}
      />,
    );

    await fireEvent.press(screen.getByText('I agree to the terms'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('announces itself as a checkbox with the sentence it stands for', async () => {
    await render(
      <AppCheckbox accessibilityLabel="I agree to the terms" checked={false} onChange={() => {}} />,
    );

    expect(screen.getByRole('checkbox', { name: 'I agree to the terms' })).toBeOnTheScreen();
  });

  it('reports its checked state', async () => {
    await render(
      <AppCheckbox accessibilityLabel="I agree to the terms" checked onChange={() => {}} />,
    );

    expect(screen.getByRole('checkbox', { name: 'I agree to the terms' })).toBeChecked();
  });

  it('is not checked when the user has not agreed', async () => {
    await render(
      <AppCheckbox accessibilityLabel="I agree to the terms" checked={false} onChange={() => {}} />,
    );

    expect(screen.getByRole('checkbox', { name: 'I agree to the terms' })).not.toBeChecked();
  });

  it('reports the new value when pressed', async () => {
    const onChange = jest.fn();
    await render(
      <AppCheckbox accessibilityLabel="I agree to the terms" checked={false} onChange={onChange} />,
    );

    await fireEvent.press(screen.getByRole('checkbox', { name: 'I agree to the terms' }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('paints the glyph in the design’s accent when checked and muted when not', async () => {
    const { rerender } = await render(
      <AppCheckbox
        accessibilityLabel="I agree to the terms"
        checked={false}
        onChange={() => {}}
        testID="consent-glyph"
      />,
    );
    expect(screen.getByTestId('consent-glyph')).toHaveStyle({
      color: themes.light.colors.textMuted,
    });

    await rerender(
      <AppCheckbox
        accessibilityLabel="I agree to the terms"
        checked
        onChange={() => {}}
        testID="consent-glyph"
      />,
    );
    expect(screen.getByTestId('consent-glyph')).toHaveStyle({ color: themes.light.colors.accent });
  });
});
