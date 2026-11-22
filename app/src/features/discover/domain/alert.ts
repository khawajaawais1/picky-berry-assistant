import type { TranslationKey } from '@/services/i18n';

import { isSpecies, type Species } from './species';

export { formatRadius } from './alert-radius';

export type Confidence = 'high' | 'medium' | 'low';
export type AlertRipeness = 'unripe' | 'ripening' | 'ripe' | 'past';

/**
 * One explainable alert the reasoning job produced for a zone and berry (feature 6.7), as
 * `GET /alerts` serves it for this picker: filtered to their species and alert radius.
 */
export type PickerAlert = {
  id: string;
  zoneId: string;
  zoneName: string;
  species: Species;
  score: number;
  confidence: Confidence;
  ripeness: AlertRipeness;
  /** Metres from the phone, or `null` when the request carried no position. */
  distanceMeters: number | null;
  latestReportAt: string | null;
  computedAt: string;
};

export type AlertFeed = {
  radiusKm: number;
  alerts: PickerAlert[];
};

export const ALERT_CONFIDENCE = ['high', 'medium', 'low'] as const satisfies readonly Confidence[];

export function confidenceLabelKey(confidence: Confidence): TranslationKey {
  return `discover.details.confidence.${confidence}`;
}

const RIPENESS: readonly AlertRipeness[] = ['unripe', 'ripening', 'ripe', 'past'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAlert(value: unknown): PickerAlert | null {
  if (!isRecord(value)) return null;
  const { id, zone_id, zone_name, species, score, confidence, ripeness } = value;
  if (
    typeof id !== 'string' ||
    typeof zone_id !== 'string' ||
    !isSpecies(species) ||
    typeof score !== 'number' ||
    !(ALERT_CONFIDENCE as readonly unknown[]).includes(confidence) ||
    !(RIPENESS as readonly unknown[]).includes(ripeness) ||
    typeof value.computed_at !== 'string'
  ) {
    return null;
  }

  return {
    id,
    zoneId: zone_id,
    zoneName: typeof zone_name === 'string' ? zone_name : '',
    species,
    score,
    confidence: confidence as Confidence,
    ripeness: ripeness as AlertRipeness,
    distanceMeters: typeof value.distance_m === 'number' ? value.distance_m : null,
    latestReportAt: typeof value.latest_report_at === 'string' ? value.latest_report_at : null,
    computedAt: value.computed_at,
  };
}

/** The alert feed, or `null` for a body that is not one; an alert the app cannot read is dropped. */
export function parseAlertFeed(body: unknown): AlertFeed | null {
  if (!isRecord(body) || !Array.isArray(body.alerts)) return null;

  return {
    radiusKm: typeof body.radius_km === 'number' ? body.radius_km : 0,
    alerts: body.alerts.map(parseAlert).filter((alert): alert is PickerAlert => alert !== null),
  };
}
