import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

import { AppText } from './app-text';

export type AppCheckboxProps = {
  /** Required: an unnamed checkbox is unusable, and the design's sits beside its sentence. */
  accessibilityLabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Addresses the glyph, which is where the design's colour lives. */
  testID?: string;
  /**
   * The sentence the control stands for, drawn inside the target. A consent row is read as one
   * control, so the words a user reads are the words they can press — the 22 px glyph alone was
   * the only way to consent (frontend review, 2026-10-25).
   */
  label?: string;
  /**
   * Content under the sentence but **outside** the target — the terms link. Reading the terms is
   * not consenting to them, so it stays a separate control.
   */
  children?: ReactNode;
};

const GLYPH_SIZE = 22;
/** Grows the 22 px glyph's touch target to the 44 px a finger needs. */
const HIT_SLOP = (layout.minTouchTarget - GLYPH_SIZE) / 2;
/** Keeps content under the sentence aligned with it rather than with the glyph. */
const LABEL_INSET = GLYPH_SIZE + spacing.gap;

/**
 * The design's consent control: a 22 px square-check, accent when ticked and muted when not
 * (frame 03, node 5:22788).
 *
 * With a `label` the whole row is the target and the sentence is the control's visible name; with
 * `children` the content sits beneath the row, outside the target. Without either it is the bare
 * glyph some callers still draw.
 *
 * The design draws its icons as vectors; this uses the nearest glyph from
 * `@expo/vector-icons` until a vector renderer is added (see PROJECT.md).
 *
 * Accessibility contract: `checkbox` role, an accessible name, and the checked and disabled
 * states — stated **twice on purpose**. `accessibilityState` is what iOS and Android read;
 * the `aria-*` props are what the web target reads, because `react-native-web` renders this
 * Pressable without `aria-checked`, which left the checked state in the glyph's colour
 * alone there (measured in the built web export, not assumed). RN treats `aria-*` as the
 * cross-platform spelling of the same state, so both platforms get one answer.
 */
export function AppCheckbox({
  accessibilityLabel,
  checked,
  onChange,
  disabled = false,
  testID,
  label,
  children,
}: AppCheckboxProps) {
  const { colors } = useAppTheme();

  const control = (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      aria-disabled={disabled}
      className={label === undefined ? undefined : 'w-full flex-row items-start gap-gap'}
      disabled={disabled}
      hitSlop={label === undefined ? HIT_SLOP : undefined}
      onPress={() => onChange(!checked)}
      style={label === undefined ? undefined : { minHeight: layout.minTouchTarget }}
    >
      <MaterialCommunityIcons
        color={checked ? colors.accent : colors.textMuted}
        name={checked ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
        size={GLYPH_SIZE}
        testID={testID}
      />
      {label === undefined ? null : (
        <AppText className="flex-1" variant="bodySmall">
          {label}
        </AppText>
      )}
    </Pressable>
  );

  if (children === undefined) {
    return control;
  }

  return (
    <View className="w-full gap-tight">
      {control}
      <View style={{ paddingLeft: LABEL_INSET }}>{children}</View>
    </View>
  );
}
