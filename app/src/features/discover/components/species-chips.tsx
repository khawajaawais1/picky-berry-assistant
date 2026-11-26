import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Feather } from '@/components/atoms/app-icon';
import { GlassSurface } from '@/components/molecules';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

import { SPECIES, type Species } from '../domain/species';
import { SPECIES_LABEL_KEY } from './species-copy';

/** Grows the design's 36 px chip to the 44 px target; the row's 12 px gaps absorb it. */
const CHIP_HIT_SLOP = {
  bottom: (layout.minTouchTarget - layout.chipHeight) / 2,
  top: (layout.minTouchTarget - layout.chipHeight) / 2,
};

export type SpeciesChipsProps = {
  /** Keeps the map overlay to one line; the document/list reading continues to wrap. */
  scrollable?: boolean;
  /**
   * True over the map: each chip is its own frosted pill, so the map shows between them rather
   * than through one large panel behind the row.
   */
  glass?: boolean;
  /** The chips that are on, as identifiers: the filter compares species, never words. */
  selected: readonly Species[];
  onToggle: (species: Species) => void;
};

/**
 * Frame 06's species chips (node 5:22959): 36 px pills, the chosen ones filled with the accent
 * colour and the others on the surface behind the palette's border — the metrics the design's
 * chips carry on every screen, with the unlit chip's surface replaced by glass where the row sits
 * over the map. The frame draws three berries (lingonberry, bilberry, cloudberry); the pilot's
 * fourth, crowberry, is the domain list's, so the row renders one chip more than the frame
 * without changing the order of the design's three.
 *
 * **The chips are one multi-select filter, and every berry starts on.** A zone carries a score
 * per berry, so the screen can show every zone the source scores for any selected berry; the
 * chips narrow that set. All four being on is the unfiltered answer, which is what a picker
 * sees first — the frame's first-chip accent was a single layer, and the app's answer is the
 * wider one. Pressing a lit chip removes its berry; the last one cannot be removed, because an
 * empty filter has no score layer to draw (the screen would have to invent one).
 *
 * The multi-select is a **checkbox group**, not four independent buttons: assistive technology
 * reads each chip's checked state, and the web target gets the same state through `aria-checked`
 * (react-native-web writes none from `accessibilityState` alone; measured in the built export,
 * frontend review 2026-10-25).
 *
 * The row wraps like the design's other chip rows: at the largest system text size three
 * labels no longer fit the content column, and the screen does not scroll sideways (ADR-019).
 */
export function SpeciesChips({
  glass = false,
  scrollable = false,
  selected,
  onToggle,
}: SpeciesChipsProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const chips = SPECIES.map((species) => {
    const on = selected.includes(species);
    const label = t(SPECIES_LABEL_KEY[species]);

    return (
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        aria-checked={on}
        className="h-chip flex-row items-center rounded-pill px-gap"
        hitSlop={CHIP_HIT_SLOP}
        key={species}
        onPress={() => onToggle(species)}
        style={{
          // A lit chip is the soft accent tint with an accent stroke, not a solid fill: every
          // berry is lit when the map opens, and four solid accent pills outweighed the map they
          // filter. An unlit one on the map is glass, and in the document reading the surface.
          backgroundColor: on ? colors.accentMuted : glass ? 'transparent' : colors.surface,
          borderColor: on ? colors.accent : colors.border,
          // The design's chips carry a 1 px stroke in either state.
          borderWidth: 1,
          gap: spacing.sm,
          overflow: 'hidden',
        }}
        testID={`species-chip-${species}`}
      >
        {!on && glass ? <GlassSurface style={StyleSheet.absoluteFill} /> : null}
        {on ? (
          // The check says "on" without leaning on the tint alone (WCAG 1.4.1).
          <Feather
            color={colors.accent}
            name="check"
            size={14}
            testID={`species-chip-${species}-check`}
          />
        ) : null}
        <AppText
          style={{ color: on ? colors.accent : colors.textMuted, fontWeight: '600' }}
          variant="label"
        >
          {label}
        </AppText>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        accessibilityLabel={t('discover.species.filter')}
        contentContainerStyle={{ flexDirection: 'row', gap: spacing.gap }}
        horizontal
        role="group"
        showsHorizontalScrollIndicator={false}
        style={{ width: '100%' }}
        testID="species-chips"
      >
        {chips}
      </ScrollView>
    );
  }

  return (
    <View
      accessibilityLabel={t('discover.species.filter')}
      className="w-full flex-row flex-wrap gap-gap"
      role="group"
      testID="species-chips"
    >
      {chips}
    </View>
  );
}
