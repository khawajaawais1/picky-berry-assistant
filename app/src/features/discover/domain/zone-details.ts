import { DEMO_ZONES, CARD_ZONE_STATE, type ZoneState } from './zone';

/**
 * What frame 07 (Core picker · Zone details, node `5:23032`) knows about a zone: its yield
 * score with the confidence behind it, how many pickers reported this week, whether it is
 * ripe, today's weather and the freshest report from the field.
 *
 * It is the **same demo zone** frame 06 draws — its card's zone, the unpicked one — because
 * the design is telling one story about one place: the map's badge, the card and this screen
 * all say 78. That tie is what `DEMO_ZONE_DETAILS` is asserted against, and it is the reason
 * this module imports frame 06's zones rather than repeating them.
 *
 * Nothing returns any of this yet: there is no zone service, no weather source and no report
 * stream. The numbers are the design's own sample (PROJECT.md, known issues), and when the
 * sources exist they replace this constant — the screen's structure does not change.
 */

/** How the flyer of a zone reads on the day: ripe enough to pick, or not yet. */
export type Ripeness = 'ripe' | 'ripening';

/** How confident the app is in a zone's score, from the reports behind it. */
export type Confidence = 'high' | 'medium' | 'low';

/** Whether the reports behind a reading have known provenance (ADR-009's trust, presented). */
export type ReportTrust = 'trusted' | 'unverified';

/** A day's conditions for a zone, as the design's weather line reads them. */
export type ZoneWeather = {
  /** Degrees Celsius. */
  temperature: number;
  wind: 'light' | 'moderate' | 'strong';
  /** The hour the forecast was made, in the device's own clock format. */
  forecastHour: string;
};

/** The freshest report from the field, and what is known about who wrote it. */
export type ZoneReport = {
  trust: ReportTrust;
  minutesAgo: number;
  /** The reporter's own yield reading, out of `REPORT_YIELD_MAX`. */
  yield: number;
};

export type ZoneDetails = {
  /** The zone these details describe; must be one of the map's own zones. */
  zoneId: string;
  /** The zone's picking state, in the same vocabulary the map's legend uses. */
  state: ZoneState;
  score: number;
  confidence: Confidence;
  /** Reports from pickers in the last seven days. */
  reportsThisWeek: number;
  ripeness: Ripeness;
  weather: ZoneWeather;
  latestReport: ZoneReport;
};

/** The yield score's own scale: the card prints the score over this (frame 07, node 5:23058). */
export const SCORE_MAX = 100;

/** The reporter's own scale: “4 / 5 yield” (frame 07, node 5:23078). */
export const REPORT_YIELD_MAX = 5;

/** The demo zone's details, as the frame draws them (frame 07, nodes 5:23047–5:23079). */
export const DEMO_ZONE_DETAILS: ZoneDetails = {
  zoneId: DEMO_ZONES.find((zone) => zone.state === CARD_ZONE_STATE)?.id ?? '',
  state: CARD_ZONE_STATE,
  score: 78,
  confidence: 'high',
  reportsThisWeek: 11,
  ripeness: 'ripe',
  weather: { temperature: 18, wind: 'light', forecastHour: '08:00' },
  latestReport: { trust: 'trusted', minutesAgo: 38, yield: 4 },
};

/**
 * The details of one zone, or nothing.
 *
 * A screen that asked for an unknown zone must not fall back to another zone's numbers:
 * showing the wrong zone's yield as the right one's is worse than showing none (the same
 * rule screen 04's destination follows). The route passes a zone identifier when zones are
 * real; today it passes the demo one.
 */
export function zoneDetailsFor(zoneId: string): ZoneDetails | undefined {
  return DEMO_ZONE_DETAILS.zoneId === zoneId ? DEMO_ZONE_DETAILS : undefined;
}
