import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { layout } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

import { AppText } from '../atoms';

export type CodeFieldProps = {
  /** The design's field label (“Verification code”); it is also the field's accessible name. */
  label: string;
  /** How many digits the code has — the frame draws six, and the caller owns the number. */
  length: number;
  onChangeText: (code: string) => void;
  /** The digits typed so far. */
  value: string;
  testID?: string;
};

/**
 * The design's “Content row” for a verification code (frame 04, node 5:22840): one cell
 * per digit, 62 px tall at the control radius, white on a 1 px border, each digit set at
 * the frame's 25/30 semibold. While the field has focus the cell the next digit lands in
 * is stroked 2 px in the accent colour — the state the frame itself draws, where the code
 * is full and the last cell carries the stroke. Without focus nothing is stroked, because
 * a focus mark belongs to a field that has the focus.
 *
 * One real text input sits over the row, invisible: a tap anywhere in the row focuses it,
 * the platform's number pad and one-time-code autofill apply to it, and it is the single
 * element assistive technology reads — the cells are a picture of the code and carry
 * `aria-hidden`, so a screen reader hears one labelled field rather than six loose digits.
 * `aria-hidden` rather than `accessibilityElementsHidden` because it is the one that
 * covers both: React Native maps it onto the two platform props on iOS and Android, and
 * `react-native-web` renders it as `aria-hidden` on the element, which is what the built
 * web target was found to need — the platform props alone left the digits in the
 * accessibility tree there.
 *
 * Accessibility contract: always one labelled field, announcing the digits typed as its
 * value, and never claiming to act.
 */
export function CodeField({ label, length, onChangeText, value, testID }: CodeFieldProps) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View className="w-full gap-section">
      <AppText style={{ fontWeight: '600' }} variant="bodySmall">
        {label}
      </AppText>
      <View className="w-full flex-row gap-sm" testID={testID}>
        {Array.from({ length }, (_, index) => {
          const active = focused && index === activeIndex;

          return (
            <View
              aria-hidden
              className="flex-1 items-center justify-center rounded-control"
              key={index}
              style={{
                backgroundColor: colors.surface,
                borderColor: active ? colors.accent : colors.border,
                borderWidth: active ? 2 : 1,
                // A minimum rather than the frame's fixed 62 px: at the largest system
                // text size the digit is taller than the box the design sizes (ADR-019).
                minHeight: layout.codeCellHeight,
              }}
              testID={testID ? `${testID}-cell-${index}` : undefined}
            >
              <AppText variant="digit">{value[index] ?? ''}</AppText>
            </View>
          );
        })}
        <TextInput
          accessibilityLabel={label}
          autoComplete="one-time-code"
          caretHidden
          keyboardType="number-pad"
          maxLength={length}
          onBlur={() => setFocused(false)}
          onChangeText={(next) => onChangeText(next.replace(/\D/g, '').slice(0, length))}
          onFocus={() => setFocused(true)}
          style={styles.input}
          textContentType="oneTimeCode"
          value={value}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    // Laid over the row rather than beside it, so a tap anywhere in the row focuses it and
    // the cells keep the only box the screen lays out.
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    // Invisible rather than unmounted: a control that is not rendered is one the platform
    // will not fill and a keyboard cannot reach.
    color: 'transparent',
    opacity: 0,
    padding: 0,
  },
});
