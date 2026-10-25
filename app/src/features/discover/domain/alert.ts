import type { Locale, TranslationKey } from '@/services/i18n';

import { formatDecimal } from './season-insights';
import type { Species } from './species';
import type { Confidence } from './zone-details';

/**
 * What frame 12 (Core picker · Alerts and forecast, node `5:23439`) says, and what it is worth.
 *
 * The design's alert is a heads-up about the forest: ripe berries a short walk north, a yield
 * score, the confidence behind it, and the three reasons the app is saying so. **Nothing here is
 * observed**: there is no weather source, no season model and no report stream, so the alert is
 * the design's own sample, exactly as frame 07's forecast and frame 08's offline note are
 * (PROJECT.md records it). What is real is the vocabulary: the score's scale, the confidence's
 * own word and the distance are the same ones frames 06 to 08 already use.
 */

/** The three confidences the design draws, in its own order (“High, Medium, Low”). */
export const ALERT_CONFIDENCE = ['high', 'medium', 'low'] as const satisfies readonly Confidence[];

/**
 * The confidence's own word, from the same table frame 07's zone card uses.
 *
 * One idea, one vocabulary: an alert claiming “High confidence” about a zone whose screen says
 * something else would be the app disagreeing with itself.
 */
export function confidenceLabelKey(confidence: Confidence): TranslationKey {
  return `discover.details.confidence.${confidence}`;
}

/**
 * The design's own alert (nodes 5:23453-5:23462): ripe bilberries 1.8 km north, on the frame's
 * own sample day, about a zone the design's story names.
 */
export const DEMO_ALERT = {
  /** How far the berries are — the frame's “1.8 km north”, with the direction in the sentence. */
  distanceMeters: 1800,
  score: 82,
  confidence: 'high',
  /** The design's own zone and place (node 5:23462). */
  zoneNumber: '18',
  place: 'Laajavuori',
  /** How long ago the freshest report behind the alert arrived — the frame's “1 h ago”. */
  latestReportMinutesAgo: 60,
  /** The frame's own stamp (“TODAY · 28 AUG · 09:30”), as the instant and the time it shows. */
  at: '2026-08-28T09:30:00.000Z',
  atTime: '09:30',
} as const;

/**
 * How many reasons the frame gives for its alert (“A warm week”, “Rain on Sunday”, “Last picked
 * 6 days ago”). The screen draws them from its own copy table; this is the count the domain
 * promises, so a screen cannot quietly drop one of the design's three.
 */
export const DEMO_ALERT_REASON_COUNT = 3;

/**
 * The frame's own preferences card (nodes 5:23480–5:23504), as the screen's own sample: ripe-berry
 * push alerts on, a 3 km search radius, quiet hours from 21:00 to 07:00, and bilberry plus one more
 * species. **Nothing reads any of them** — no alert is delivered, no permission is asked for, and
 * no radius, hour or species filter exists — so they are the design's sample rather than this
 * phone's settings, which is what the screen says on the card itself (ADR-043).
 */
export const DEMO_ALERT_PREFERENCES = {
  pushAlerts: true,
  /** Kilometres, as the frame's own “3 km” — the unit is the value's, the word is the catalogue's. */
  radiusKm: 3,
  quietFrom: '21:00',
  quietTo: '07:00',
  /** One of the app's own species, so the row's word comes from the one vocabulary table. */
  speciesId: 'bilberry' satisfies Species,
  /** How many species beyond the first the sample subscribes to (“+ 1” on the frame). */
  extraSpecies: 1,
} as const;

/**
 * A radius setting as the frame prints it: a whole number of kilometres with the language's own
 * decimal mark (“3 km”), never a trailing zero.
 *
 * The app's distances print one decimal — frame 08's route is “1.4 km” because it is a measured
 * walk — while a radius is a number the picker set, and the frame draws this one as “3 km” on the
 * same screen its headline prints “1.8 km”. A radius that is not a whole kilometre still writes
 * the language's number (“2,5 km” in Finnish), and a negative one is a mistake the caller has to
 * see rather than a radius drawn backwards.
 */
export function formatRadius(kilometres: number, locale: Locale): string {
  if (!Number.isFinite(kilometres) || kilometres < 0) {
    throw new RangeError(`a radius is a non-negative number of kilometres, got ${kilometres}`);
  }

  return `${formatDecimal(kilometres, locale)} km`;
}
