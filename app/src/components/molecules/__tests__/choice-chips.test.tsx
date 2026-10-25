import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, themes, typography } from '@/constants/theme';

import { ChoiceChips } from '../choice-chips';

const OPTIONS = [
  { label: 'Email', value: 'email' },
  { label: 'Phone number', value: 'phone' },
] as const;

/**
 * Screen 03's pair of chips, node 5:22788: 36 px pills, the selected one filled with
 * the accent and the other on the surface colour with a 1 px border.
 */
describe('ChoiceChips', () => {
  it('renders every option as a choice', async () => {
    await render(
      <ChoiceChips label="How to sign up" onChange={() => {}} options={OPTIONS} value="email" />,
    );

    expect(screen.getByRole('radio', { name: 'Email' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Phone number' })).not.toBeChecked();
  });

  it('keeps each chip reachable on its own rather than flattening the group', async () => {
    await render(
      <ChoiceChips label="How to sign up" onChange={() => {}} options={OPTIONS} value="email" />,
    );

    // The row carries the group role for the web, but must stay a plain container:
    // marking it `accessible` would collapse both chips into one node on iOS.
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('grows the 36 px chip to the 44 px target with hit slop', async () => {
    // The design's chip is 36 px tall. The row's 12 px gaps are wider than the 4 px the target
    // needs on each side, so the grown targets cannot overlap.
    await render(
      <ChoiceChips label="How to sign up" onChange={() => {}} options={OPTIONS} value="email" />,
    );

    expect(screen.getByRole('radio', { name: 'Email' }).props.hitSlop).toMatchObject({
      bottom: 4,
      top: 4,
    });
  });

  it('reports the chosen option', async () => {
    const onChange = jest.fn();
    await render(
      <ChoiceChips label="How to sign up" onChange={onChange} options={OPTIONS} value="email" />,
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'Phone number' }));

    expect(onChange).toHaveBeenCalledWith('phone');
  });

  it('fills the selected chip with the accent colour', async () => {
    await render(
      <ChoiceChips label="How to sign up" onChange={() => {}} options={OPTIONS} value="email" />,
    );

    const selected = screen.getByRole('radio', { name: 'Email' });
    expect(selected).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
      borderColor: themes.light.colors.accent,
      borderRadius: radii.pill,
      height: layout.chipHeight,
    });
    expect(screen.getByText('Email')).toHaveStyle({ color: themes.light.colors.onAccent });
  });

  it('leaves the unselected chips on the surface colour with a hairline border', async () => {
    await render(
      <ChoiceChips label="How to sign up" onChange={() => {}} options={OPTIONS} value="email" />,
    );

    expect(screen.getByRole('radio', { name: 'Phone number' })).toHaveStyle({
      backgroundColor: themes.light.colors.surface,
      borderColor: themes.light.colors.border,
    });
    expect(screen.getByText('Phone number')).toHaveStyle({
      color: themes.light.colors.textMuted,
      fontSize: typography.label.fontSize,
    });
  });
});
