import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { layout, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type AppTextInputProps = TextInputProps & {
  /** Rendered inside the field, after the value — the design's mail and reveal controls. */
  accessory?: ReactNode;
  /**
   * Rendered inside the field, before the value: the search field's magnifier (frame 06, node
   * `5:24122`). A glyph the field does not act on is drawn here rather than made a control —
   * the frame draws it as part of the field.
   */
  leading?: ReactNode;
  /**
   * The field's own height, as a **floor**: the foundations' 54 px control by default, the
   * design's 50 px search field where a caller asks for it. A floor rather than a fixed box
   * because the value inside grows with the system text size, and a field that kept the
   * frame's height would cut it off (ADR-019).
   */
  height?: number;
};

/**
 * The app's only text input, at the design's “Input” metrics: 54 px tall (the height
 * the foundations give every control), 10 px radius, 1 px border, 14 px inset, 16/22
 * value and a 20 px accessory held against the right inset.
 *
 * `testID` addresses the field's frame (the box). The accessible name stays on the
 * input itself, so assistive technology reads a labelled text field.
 */
export function AppTextInput({
  accessory,
  height = layout.actionHeight,
  leading,
  style,
  testID,
  ...rest
}: AppTextInputProps) {
  const { colors } = useAppTheme();

  return (
    <View
      className="w-full flex-row items-center gap-sm rounded-control px-field py-field"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        minHeight: height,
      }}
      testID={testID}
    >
      {leading}
      <TextInput
        {...rest}
        placeholderTextColor={colors.textMuted}
        style={[typography.body, styles.input, { color: colors.text }, style]}
      />
      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    // A field's intrinsic width is a character count at the current font size, and the
    // platform's automatic minimum size would hold it at that width: at a large system text
    // size the value's box grows past the field and pushes the row off the screen. Zero lets
    // the field keep its width and the value scroll inside it, as it does on a device
    // (ADR-019).
    minWidth: 0,
    padding: 0,
  },
});
