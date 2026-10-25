import { Pressable, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

import { SPECIES, type Species } from '../domain/species';
import { SPECIES_LABEL_KEY } from './species-copy';

export type SpeciesChipsProps = {
  /** The chips that are on, as identifiers: the filter compares species, never words. */
  selected: readonly Species[];
  onToggle: (species: Species) => void;
};

/**
 * Frame 06's species chips (node 5:22959): 36 px pills, the chosen one filled with the accent
 * colour and the others on the surface behind the palette's border — the metrics the design's
 * chips carry on every screen. The frame draws three berries (lingonberry, bilberry,
 * cloudberry); the pilot's fourth, crowberry, is the domain list's, so the row renders one
 * chip more than the frame without changing the order of the design's three.
 *
 * One chip can be on, two can, or none, which is why these are checkboxes and not the
 * mutually exclusive `ChoiceChips` the onboarding screens use: filtering by lingonberry and
 * bilberry at once is a question a picker asks. The checked state is stated twice on purpose
 * — `accessibilityState` for iOS and Android, `aria-checked` for the web target, which writes
 * no state from the Pressable on its own (measured in the built export; the same fix the
 * consent checkbox needed).
 *
 * The frame paints its first chip as chosen while drawing every zone on its map. The app opens
 * with no chip on instead, because a chip painted chosen while nothing has been filtered away
 * would claim a filter that is not in effect (docs/design-source.md).
 *
 * The row wraps like the design's other chip rows: at the largest system text size three
 * labels no longer fit the content column, and the screen does not scroll sideways (ADR-019).
 */
export function SpeciesChips({ selected, onToggle }: SpeciesChipsProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View
      accessibilityLabel={t('discover.species.filter')}
      className="w-full flex-row flex-wrap gap-gap"
      testID="species-chips"
    >
      {SPECIES.map((species) => {
        const on = selected.includes(species);
        const label = t(SPECIES_LABEL_KEY[species]);

        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            className="h-chip flex-row items-center rounded-pill px-gap"
            key={species}
            onPress={() => onToggle(species)}
            style={{
              backgroundColor: on ? colors.accent : colors.surface,
              borderColor: on ? colors.accent : colors.border,
              // The design's chips carry a 1 px stroke in either state.
              borderWidth: 1,
            }}
            testID={`species-chip-${species}`}
          >
            <AppText
              style={{ color: on ? colors.onAccent : colors.textMuted, fontWeight: '600' }}
              variant="label"
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
