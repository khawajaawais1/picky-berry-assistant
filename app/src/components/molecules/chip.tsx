import { View, type ViewProps } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

import { AppText } from '../atoms';

export type ChipTone = 'warning' | 'accent' | 'plain';

export type ChipProps = ViewProps & {
  label: string;
  tone?: ChipTone;
  testID?: string;
};

/**
 * The design's chip, at its own metrics (36 px tall, fully rounded, 12 px inset, 13 px semibold)
 * and in the three states its frames paint: the warning tint of a disclosure, the accent fill of a
 * chip the frame draws as chosen, and the plain surface of the rest.
 *
 * It claims **no role**, and that is deliberate on every screen that draws one — a chip is a
 * *reading of a state*, not a control: frame 15's three filter chips would leave the app's two
 * listings unchanged, frame 18's “Provider test mode” is not a control at all, the disclosed
 * demo's label is the frame's own, and frame 14's “Picker”/“Buyer” pair says which role the
 * account is for while the app has exactly one. A pressable that cannot change anything must not
 * announce itself as one (AGENTS.md §11.2) — the same rule frame 11's period chips are drawn
 * under. A chip that *can* act is `ChoiceChips`, which is a radio group.
 *
 * It lives in shared molecules because three real screens draw one now (AGENTS.md §2.5): the
 * marketplace's own frames, which is where it came from — ADR-026 records it as `MarketChip`, and
 * the marketplace's decision is unchanged by the move — and frame 14's account card, which the
 * settings screen draws. The design metrics are one thing, so there is one component for them.
 */
export function Chip({ label, tone = 'plain', testID, style, ...rest }: ChipProps) {
  const { colors } = useAppTheme();

  const paint = {
    warning: { background: colors.warningMuted, border: colors.warningMuted, text: colors.warning },
    accent: { background: colors.accent, border: colors.accent, text: colors.onAccent },
    plain: { background: colors.surface, border: colors.border, text: colors.textMuted },
  }[tone];

  return (
    <View
      {...rest}
      className="h-chip flex-row items-center rounded-pill px-gap"
      style={[
        {
          backgroundColor: paint.background,
          borderColor: paint.border,
          // The design's chips carry a 1 px stroke.
          borderWidth: 1,
        },
        style,
      ]}
      testID={testID}
    >
      <AppText style={{ color: paint.text, fontWeight: '600' }} variant="label">
        {label}
      </AppText>
    </View>
  );
}
