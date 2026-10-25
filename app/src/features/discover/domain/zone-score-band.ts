import type { ThemeColors } from '@/constants/theme';

/**
 * What a zone's fill means on the map: five yield-score bands, as the spec's A3 rule asks
 * (docs/features/6.2-live-site-map.md).
 *
 * The **edges are the app's own**. The spec names the count — five bands — and nothing more,
 * so they are recorded here rather than assumed at a call site: 0–19, 20–39, 40–59, 60–79,
 * 80–100. A score of exactly 20 belongs to the second band, which is the boundary a naive
 * `score / 20` gets wrong.
 *
 * Every band names two tokens rather than a colour: the map and the legend paint from the
 * same pair, exactly as the design's three states did (`ZONE_APPEARANCE`), so a recoloured
 * band cannot leave the legend naming a colour no zone is drawn in.
 */
export type ZoneScoreBand = {
  /** The band's lower edge, and the value the map's `match` expression keys on. */
  min: number;
  /** The band's upper edge, inclusive. */
  max: number;
  fill: keyof ThemeColors;
  line: keyof ThemeColors;
};

export const ZONE_SCORE_BANDS: readonly ZoneScoreBand[] = [
  { min: 0, max: 19, fill: 'mapScoreLowest', line: 'mapScoreLowestLine' },
  { min: 20, max: 39, fill: 'mapScoreLow', line: 'mapScoreLowLine' },
  { min: 40, max: 59, fill: 'mapScoreMid', line: 'mapScoreMidLine' },
  { min: 60, max: 79, fill: 'mapScoreHigh', line: 'mapScoreHighLine' },
  { min: 80, max: 100, fill: 'mapScoreHighest', line: 'mapScoreHighestLine' },
];

/**
 * The band a score falls in. Clamped rather than undefined: the parser already refuses a
 * score outside 0–100, and a renderer that gets one anyway should paint the end of the
 * scale instead of nothing.
 */
export function scoreBand(score: number): ZoneScoreBand {
  if (!Number.isFinite(score)) return ZONE_SCORE_BANDS[0]!;

  const clamped = Math.min(100, Math.max(0, Math.round(score)));

  return ZONE_SCORE_BANDS.find((band) => clamped <= band.max) ?? ZONE_SCORE_BANDS.at(-1)!;
}

/**
 * The opacity a zone is painted at: a low-confidence score is faded, so a colour a user
 * reads as “plenty” never looks as certain as one the app actually is certain about.
 * The legend names the treatment in words.
 */
export const ZONE_LOW_CONFIDENCE_OPACITY = 0.4;
export const ZONE_CONFIDENT_OPACITY = 0.85;
