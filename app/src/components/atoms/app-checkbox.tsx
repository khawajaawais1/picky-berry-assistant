import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { layout } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type AppCheckboxProps = {
  /** Required: an unnamed checkbox is unusable, and the design's sits beside its sentence. */
  accessibilityLabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Addresses the glyph, which is where the design's colour lives. */
  testID?: string;
};

const GLYPH_SIZE = 22;
/** Grows the 22 px glyph's touch target to the 44 px a finger needs. */
const HIT_SLOP = (layout.minTouchTarget - GLYPH_SIZE) / 2;

/**
 * The design's consent control: a 22 px square-check, accent when ticked and muted
 * when not (frame 03, node 5:22788).
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
}: AppCheckboxProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={() => onChange(!checked)}
    >
      <MaterialCommunityIcons
        color={checked ? colors.accent : colors.textMuted}
        name={checked ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
        size={GLYPH_SIZE}
        testID={testID}
      />
    </Pressable>
  );
}
