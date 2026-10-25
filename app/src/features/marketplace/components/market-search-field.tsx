import { Feather } from '@expo/vector-icons';

import { AppTextInput } from '@/components/atoms';
import { layout } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

export type MarketSearchFieldProps = {
  /** What stands in the field, exactly as the picker typed it. The filter reads it. */
  value: string;
  onChangeText: (value: string) => void;
};

/** The frame's magnifier glyph, measured inside the field's left inset (node `5:24491`). */
const GLYPH_SIZE = 22;

/**
 * Frame 15's search field (node `5:23797`): the design's 342x50 box, its 14 px inset, the magnifier
 * at the left and “Berries near Jyväskylä” standing in it.
 *
 * It is the same field component frame 06's search uses (`AppTextInput` at
 * `layout.searchHeight`), written here rather than imported from `features/discover` because a
 * feature's internals are its own (AGENTS.md §3) and this is the second use, not the third.
 *
 * One thing the frame draws and this does not: its **sliders glyph**, which is a filter sheet the
 * app does not have — frame 15's three filter chips sit directly below the field and are what
 * narrows the list, as frame 06's species chips are there. The field's accessible name is its own
 * hint, so a screen reader announces what the field is for rather than reading an empty box.
 */
export function MarketSearchField({ value, onChangeText }: MarketSearchFieldProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const hint = t('market.search.placeholder');

  return (
    <AppTextInput
      accessibilityLabel={hint}
      height={layout.searchHeight}
      leading={<Feather color={colors.textMuted} name="search" size={GLYPH_SIZE} />}
      onChangeText={onChangeText}
      placeholder={hint}
      // The list filters as it is typed, so the keyboard's own key says what happens.
      returnKeyType="search"
      testID="market-search-field"
      value={value}
    />
  );
}
