import type { TranslationKey } from '@/services/i18n';

import type { Species } from '../domain/species';

/**
 * The one table that turns a species into its word, so the three screens that name berries
 * cannot disagree: frame 06's filter chips, frame 07's zone chips and frame 10's report chips
 * all read the same catalogue keys, and screen 11's history rows ask this table what a stored
 * report's species is called.
 *
 * It sits beside the other discover copy (`zone-state-copy.ts`, `report-copy.ts`) and covers
 * **the vocabulary, not one frame's chips**: the app can name three berries, while frame 10
 * offers two of them and frame 06 three (frame 07's third chip is “More”, an index the app
 * does not have — see docs/design-source.md).
 */
export const SPECIES_LABEL_KEY: Record<Species, TranslationKey> = {
  lingonberry: 'report.species.lingonberry',
  bilberry: 'report.species.bilberry',
  cloudberry: 'report.species.cloudberry',
};

/**
 * The key that names a species, or `null` for one the app has no word for.
 *
 * Screen 11's history rows carry the species a stored report names (`speciesId` is the queue's
 * own string), so the caller has to be able to ask rather than assume: a species the catalogue
 * does not know is printed as the identifier it is, not as another berry's name.
 */
export function speciesLabelKey(speciesId: string): TranslationKey | null {
  return speciesId in SPECIES_LABEL_KEY ? SPECIES_LABEL_KEY[speciesId as Species] : null;
}
