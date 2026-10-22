import type { TranslationKey } from '@/services/i18n';
import type { YieldRating } from '@/services/report-queue';

/**
 * The table that turns frame 10's rating into its words, kept beside the other discover copy
 * (`zone-state-copy.ts`, `species-copy.ts`) so no screen repeats it and no key is written
 * twice. The species' own words are not frame 10's — the filter chips and the zone chips name
 * the same berries — so they live in `species-copy.ts`.
 */

/**
 * The frame's own words for the five options, in order: “None, Few, Fair, Good, Lots”. They
 * are the rating's accessible names too, which is why each is a whole word rather than a
 * number a screen reader would read as “four” — and why the keys are words rather than
 * digits, which the catalogue's dead-copy scan cannot spell out.
 */
export const RATING_MEANING_KEY: Record<YieldRating, TranslationKey> = {
  1: 'report.rating.none',
  2: 'report.rating.few',
  3: 'report.rating.fair',
  4: 'report.rating.good',
  5: 'report.rating.lots',
};
