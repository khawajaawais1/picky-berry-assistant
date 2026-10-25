import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { YIELD_RATINGS, type YieldRating } from '@/services/report-queue';

export type YieldRatingRowProps = {
  /** The question the row answers — the frame's “How plentiful were the berries?”. */
  label: string;
  value: YieldRating;
  /** Each option's own word (“None” … “Lots”), from the catalogue. */
  meanings: Record<YieldRating, string>;
  onChange: (value: YieldRating) => void;
};

/**
 * The design's five-cell yield rating (frame 10, node `5:23289`): equal cells 7 px apart, each
 * holding the number over its meaning, at a 72 px floor. The chosen cell is filled with the
 * accent colour and its two lines turn white.
 *
 * The cells are one radio group, so assistive technology reports which answer is chosen rather
 * than announcing five buttons — and the accessible name of each is the *meaning* (“Good”),
 * never the digit, which on its own says nothing about what was found. The chosen state is stated
 * **twice on purpose**, exactly as `AppCheckbox` and the species chips state theirs:
 * `accessibilityState` is what iOS and Android read, and `aria-checked` is what the web target
 * reads — this row had only the first, so in the built web export the chosen answer lived in the
 * cell's fill colour and nowhere a screen reader could hear it. Found by the accessibility-tree
 * walk over every screen, not by a person reading this file (`e2e/accessibility.spec.ts`).
 *
 * The cells size themselves to their contents and share what is left of the row, and the row
 * wraps if it has to. The frame draws five equal 63 px cells, and that cannot work: the Finnish
 * for “Fair” (“Kohtalaisesti”) is a single word wider than 63 px at the design's own 11 px, so an
 * equal cell clips it — at 100 % text, not only at 200 % (the layout harness caught exactly that).
 * A cell that is narrower than its own word has no honest rendering; a row that reflows does,
 * which is the same trade the map's legend makes (ADR-019).
 */
export function YieldRatingRow({ label, value, meanings, onChange }: YieldRatingRowProps) {
  const { colors } = useAppTheme();

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="radiogroup"
      className="w-full gap-sm"
      testID="yield-rating"
    >
      <AppText style={{ fontWeight: '600' }}>{label}</AppText>
      <View className="w-full flex-row flex-wrap gap-label">
        {YIELD_RATINGS.map((rating) => {
          const selected = rating === value;

          return (
            <Pressable
              accessibilityLabel={meanings[rating]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              className="flex-grow items-center justify-center rounded-control"
              key={rating}
              onPress={() => onChange(rating)}
              style={{
                backgroundColor: selected ? colors.accent : colors.surface,
                borderColor: selected ? colors.accent : colors.border,
                // The frame's cells carry a 1 px stroke; the unselected ones sit on a hairline
                // like every other control in the app.
                borderWidth: selected ? 1 : StyleSheet.hairlineWidth,
                gap: spacing.tight,
                minHeight: layout.ratingCellHeight,
              }}
              testID={`yield-rating-${rating}`}
            >
              <AppText style={{ color: selected ? colors.onAccent : colors.text }} variant="rating">
                {rating}
              </AppText>
              <AppText
                style={{ color: selected ? colors.onAccent : colors.textMuted }}
                variant="ratingLabel"
              >
                {meanings[rating]}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
