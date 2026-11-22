import type { AlertRipeness, Confidence } from './alert';
import { isSpecies, type Species } from './species';
import { PILOT_ZONE_SPECIES } from './zone-source';

/**
 * One explainable alert as the reasoning service (feature 6.7, `GET /api/v1/alerts` on the
 * backend) serves it: a zone and berry an ontology rule fired for, with the plain-English
 * `sentence` the rule wrote. The sentence is what a picker reads in the notification.
 */
export type ReasoningAlert = {
  ruleId: string;
  zoneId: string;
  zoneName: string;
  species: Species;
  score: number;
  confidence: Confidence;
  ripeness: AlertRipeness;
  sentence: string;
};

/** The same floors the backend applies before an FCM push (`backend/app/modules/push`). */
export const NOTIFY_MIN_SCORE = 70;
export const NOTIFY_MAX_PER_DAY = 2;
export const NOTIFY_COOLDOWN_DAYS = 3;

const CONFIDENCE: readonly Confidence[] = ['high', 'medium', 'low'];
const RIPENESS: readonly AlertRipeness[] = ['unripe', 'ripening', 'ripe', 'past'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** A zone id travels into a route param, so only an identifier's characters are accepted. */
const ZONE_ID = /^[A-Za-z0-9_-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseOne(value: unknown): ReasoningAlert | null {
  if (!isRecord(value)) return null;
  const { ruleId, zoneId, zoneNumber, species, score, confidence, ripeness, sentence } = value;
  if (
    typeof ruleId !== 'string' ||
    typeof zoneId !== 'string' ||
    !ZONE_ID.test(zoneId) ||
    !isSpecies(species) ||
    typeof score !== 'number' ||
    !(CONFIDENCE as readonly unknown[]).includes(confidence) ||
    !(RIPENESS as readonly unknown[]).includes(ripeness) ||
    typeof sentence !== 'string' ||
    sentence.trim() === ''
  ) {
    return null;
  }

  return {
    ruleId,
    zoneId,
    zoneName: typeof zoneNumber === 'string' ? zoneNumber : '',
    species,
    score,
    confidence: confidence as Confidence,
    ripeness: ripeness as AlertRipeness,
    sentence,
  };
}

/** The alerts, best score first, or `null` for a body that is not a list of them. */
export function parseReasoningAlerts(body: unknown): ReasoningAlert[] | null {
  if (!Array.isArray(body)) return null;

  return body
    .map(parseOne)
    .filter((alert): alert is ReasoningAlert => alert !== null)
    .sort((a, b) => b.score - a.score);
}

/** One key per zone and berry: the unit the cooldown is counted in. */
export function alertKey(alert: Pick<ReasoningAlert, 'zoneId' | 'species'>): string {
  return `${alert.zoneId}:${alert.species}`;
}

/** When this phone last notified each zone and berry, ISO-8601, keyed by `alertKey`. */
export type NotifiedAlerts = Readonly<Record<string, string>>;

function sameLocalDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/**
 * Which alerts this phone should show now: confident ones scoring at least 70, no zone and berry
 * again within three days, and no more than two a day counting what was already shown today.
 */
export function alertsToNotify({
  alerts,
  notified,
  now,
}: {
  alerts: readonly ReasoningAlert[];
  notified: NotifiedAlerts;
  now: Date;
}): ReasoningAlert[] {
  const sentToday = Object.values(notified).filter((at) => sameLocalDay(new Date(at), now)).length;
  const room = Math.max(0, NOTIFY_MAX_PER_DAY - sentToday);

  return [...alerts]
    .filter((alert) => alert.score >= NOTIFY_MIN_SCORE && alert.confidence !== 'low')
    .filter((alert) => {
      const last = notified[alertKey(alert)];
      return (
        last === undefined ||
        now.getTime() - new Date(last).getTime() >= NOTIFY_COOLDOWN_DAYS * DAY_MS
      );
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, room);
}

/** The notification's hidden data: the FCM push's own map, every value a string. */
export function alertNotificationData(alert: ReasoningAlert): Record<string, string> {
  return {
    ruleId: alert.ruleId,
    species: alert.species,
    zoneId: alert.zoneId,
    score: String(alert.score),
    confidence: alert.confidence,
  };
}

export type ZoneTarget = { zoneId: string; species: Species };

/**
 * The zone a tapped notification opens, read from its data (a local alert's or an FCM push's).
 * The payload is input the app may not have built, so a zone id is accepted only as an
 * identifier and an unknown berry falls back to the pilot's.
 */
export function zoneTargetOf(data: unknown): ZoneTarget | null {
  if (!isRecord(data)) return null;
  const { zoneId, species } = data;
  if (typeof zoneId !== 'string' || !ZONE_ID.test(zoneId)) return null;

  return { zoneId, species: isSpecies(species) ? species : PILOT_ZONE_SPECIES };
}
