import { Feather } from '@expo/vector-icons';

import { AppTextInput } from '@/components/atoms';
import { layout } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

export type ZoneSearchFieldProps = {
  /** What stands in the field, exactly as the picker typed it. The filter reads it. */
  value: string;
  onChangeText: (value: string) => void;
};

/** The frame's magnifier glyph, measured behind the field's left inset (node `5:24122`). */
const GLYPH_SIZE = 22;

/**
 * Frame 06's search field (node `5:22955`): the design's 342x50 box, its 14 px inset, the
 * magnifier at the left and “Search a place or zone” standing in it.
 *
 * It is the app's one text input at the frame's own height (`layout.searchHeight`), not a
 * second field component: the design's inputs are otherwise the foundations' 54 px control,
 * and the whole difference between the two is that number.
 *
 * Two things the frame draws and this does not: its **sliders glyph**, which is a filter
 * affordance for a sheet this app does not have — the species chips sit directly below the
 * field and are the filter — and a **clear** control, which no frame draws. The field's
 * accessible name is the placeholder's own words, so a screen reader announces what the field
 * is for rather than reading an empty box: a placeholder is not a label (WCAG 3.3.2 asks for
 * one, and it has to survive the moment the picker starts typing, which is when the
 * placeholder disappears).
 */
export function ZoneSearchField({ value, onChangeText }: ZoneSearchFieldProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const hint = t('discover.search.placeholder');

  return (
    <AppTextInput
      accessibilityLabel={hint}
      height={layout.searchHeight}
      leading={<Feather color={colors.textMuted} name="search" size={GLYPH_SIZE} />}
      onChangeText={onChangeText}
      placeholder={hint}
      // The field filters as it is typed, so the keyboard's own key says what happens.
      returnKeyType="search"
      testID="zone-search-field"
      value={value}
    />
  );
}
