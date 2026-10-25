import { Pressable, View } from 'react-native';

import { layout } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

import { AppText } from '../atoms';

/** Grows the design's 36 px chip to the 44 px target; the row's 12 px gaps absorb it. */
const CHIP_HIT_SLOP = {
  bottom: (layout.minTouchTarget - layout.chipHeight) / 2,
  top: (layout.minTouchTarget - layout.chipHeight) / 2,
};

export type ChoiceChipOption<Value extends string> = {
  label: string;
  value: Value;
};

export type ChoiceChipsProps<Value extends string> = {
  /** Accessible name for the group of choices. */
  label: string;
  options: readonly ChoiceChipOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
};

/**
 * A row of mutually exclusive chip choices, at the design's “Chip” metrics (frame 03,
 * node 5:22788): 36 px tall, fully rounded, 12 px inset, 13 px semibold label. The
 * chosen chip is filled with the accent colour; the others sit on the surface colour
 * behind the palette's border.
 *
 * The chips are one radio group, so assistive technology reports the selection
 * instead of presenting a row of unrelated buttons — and that selection is stated **twice on
 * purpose**, exactly as `AppCheckbox` states its own: `accessibilityState` is what iOS and
 * Android read (and what a Jest render sees, since React Native folds `aria-*` into it before
 * the host element exists), while `aria-checked` is what the web target reads. Without the
 * second spelling `react-native-web` rendered these chips with the choice in the fill colour and
 * nowhere else; it was found in the built web export on the sign-in prototype's variant B, and
 * the web half is held by `e2e/accessibility.spec.ts`.
 */
export function ChoiceChips<Value extends string>({
  label,
  options,
  value,
  onChange,
}: ChoiceChipsProps<Value>) {
  const { colors } = useAppTheme();

  // `flex-wrap`: the design sets the chips in one row, and the design's labels fit in one.
  // At a large system text size they do not — in Finnish “Sähköposti” and “Puhelinnumero”
  // together need more than the content column — and the screen does not scroll sideways,
  // so a second line is the only way to keep the choice reachable (ADR-019).
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="radiogroup"
      className="flex-row flex-wrap gap-gap"
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            className="h-chip flex-row items-center rounded-pill px-gap"
            hitSlop={CHIP_HIT_SLOP}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              backgroundColor: selected ? colors.accent : colors.surface,
              borderColor: selected ? colors.accent : colors.border,
              // The design's chips carry a 1 px stroke.
              borderWidth: 1,
            }}
          >
            <AppText
              style={{ color: selected ? colors.onAccent : colors.textMuted, fontWeight: '600' }}
              variant="label"
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
