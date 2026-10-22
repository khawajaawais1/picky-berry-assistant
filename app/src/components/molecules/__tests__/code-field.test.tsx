import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, themes, typography } from '@/constants/theme';

import { CodeField } from '../code-field';

/**
 * Frame 04's “Content row”, node 5:22840: six cells of 50x62 at an 8 px gap, 10 px
 * radius, white on a 1 px border, one digit each at 25/30 semibold. The frame draws its
 * last cell with a 2 px accent stroke, which is the cell the next digit lands in.
 */
const LABEL = 'Verification code';

/**
 * The cells are hidden from assistive technology, which RNTL treats as hidden elements:
 * the queries that inspect them have to say so. Nothing in the app sees them any other
 * way — that is the point of hiding them.
 */
const HIDDEN = { includeHiddenElements: true } as const;

async function renderField(value = '') {
  const onChangeText = jest.fn();

  await render(
    <CodeField label={LABEL} length={6} onChangeText={onChangeText} testID="code" value={value} />,
  );

  return { onChangeText };
}

describe('CodeField', () => {
  it('draws one cell per digit of the code', async () => {
    await renderField();

    for (let index = 0; index < 6; index += 1) {
      expect(screen.getByTestId(`code-cell-${index}`, HIDDEN)).toBeOnTheScreen();
    }
    expect(screen.queryByTestId('code-cell-6', HIDDEN)).not.toBeOnTheScreen();
  });

  it('shows the digits typed so far, one per cell', async () => {
    await renderField('482169');

    for (const digit of ['4', '8', '2', '1', '6', '9']) {
      expect(screen.getByText(digit, HIDDEN)).toBeOnTheScreen();
    }
    expect(screen.getByLabelText(LABEL).props.value).toBe('482169');
  });

  it('labels the field with the design’s field label and hides the cells’ digits from assistive technology', async () => {
    await renderField('48');

    // The six cells are a picture of the code: one labelled field is what a screen reader
    // should find, not six loose digits it has to reassemble. `aria-hidden` is the prop
    // that covers both platforms — React Native maps it onto its two native props, and the
    // web target renders it as the attribute the browser obeys (found in the built app,
    // where the native props alone left the digits in the accessibility tree).
    expect(screen.getByText(LABEL)).toBeOnTheScreen();
    expect(screen.getByLabelText(LABEL)).toBeOnTheScreen();

    for (const digit of ['4', '8']) {
      const cell = screen.getByText(digit, HIDDEN).parent;
      expect(cell?.props['aria-hidden']).toBe(true);
    }
  });

  it('takes digits only, and never more than the code is long', async () => {
    const { onChangeText } = await renderField();

    await fireEvent.changeText(screen.getByLabelText(LABEL), '482 16a9');

    expect(onChangeText).toHaveBeenCalledWith('482169');
  });

  it('asks for the number pad and offers the platform’s one-time-code autofill', async () => {
    await renderField();

    expect(screen.getByLabelText(LABEL).props).toMatchObject({
      autoComplete: 'one-time-code',
      keyboardType: 'number-pad',
      maxLength: 6,
      textContentType: 'oneTimeCode',
    });
  });

  it('draws the frame’s cells', async () => {
    await renderField();

    for (let index = 0; index < 6; index += 1) {
      expect(screen.getByTestId(`code-cell-${index}`, HIDDEN)).toHaveStyle({
        backgroundColor: themes.light.colors.surface,
        borderColor: themes.light.colors.border,
        borderWidth: 1,
        minHeight: layout.codeCellHeight,
        borderRadius: radii.control,
      });
    }
  });

  it('gives a digit the frame’s 25 px semibold metrics', async () => {
    await renderField('4');

    expect(screen.getByText('4', HIDDEN)).toHaveStyle({
      fontSize: typography.digit.fontSize,
      fontWeight: typography.digit.fontWeight,
      lineHeight: typography.digit.lineHeight,
    });
  });

  it('marks the cell the next digit lands in while the field has focus, as the frame draws its last one', async () => {
    const { rerender } = await render(
      <CodeField label={LABEL} length={6} onChangeText={() => {}} testID="code" value="48" />,
    );

    // Nothing is marked while the field is waiting: the frame's stroke is a focus mark,
    // and a focus mark on a field that does not have the focus would be a lie.
    expect(screen.getByTestId('code-cell-2', HIDDEN)).toHaveStyle({ borderWidth: 1 });

    await fireEvent(screen.getByLabelText(LABEL), 'focus');

    expect(screen.getByTestId('code-cell-2', HIDDEN)).toHaveStyle({
      borderColor: themes.light.colors.accent,
      borderWidth: 2,
    });
    expect(screen.getByTestId('code-cell-0', HIDDEN)).toHaveStyle({ borderWidth: 1 });

    // A full code has nowhere left to land, so the frame's own state — six digits, the
    // last cell stroked — is what the field ends on.
    await rerender(
      <CodeField label={LABEL} length={6} onChangeText={() => {}} testID="code" value="482169" />,
    );

    expect(screen.getByTestId('code-cell-5', HIDDEN)).toHaveStyle({
      borderColor: themes.light.colors.accent,
      borderWidth: 2,
    });
  });

  it('drops the mark when the field loses the focus', async () => {
    await renderField('48');

    await fireEvent(screen.getByLabelText(LABEL), 'focus');
    expect(screen.getByTestId('code-cell-2', HIDDEN)).toHaveStyle({ borderWidth: 2 });

    await fireEvent(screen.getByLabelText(LABEL), 'blur');

    expect(screen.getByTestId('code-cell-2', HIDDEN)).toHaveStyle({ borderWidth: 1 });
  });

  it('keeps the real input invisible, because the cells are what the frame shows', async () => {
    await renderField();

    expect(screen.getByLabelText(LABEL)).toHaveStyle({ opacity: 0 });
  });
});
