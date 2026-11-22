import type { AlertFeed } from './domain/alert';
import type { Zone, ZoneSource } from './domain/zone-source';

/** A served zone, for the screen tests. Its middle is about 62.2548 N, 25.6964 E. */
export const LIVE_ZONE: Zone = {
  id: 'zone-a',
  h3: 'zone-a',
  name: 'Laajavuori 1',
  score: 70,
  confidence: 'high',
  ripeness: 'ripe',
  scores: {
    bilberry: { score: 53, confidence: 'medium', ripeness: 'past' },
    lingonberry: { score: 70, confidence: 'high', ripeness: 'ripe' },
  },
  ring: [
    [25.689711, 62.25623],
    [25.69564, 62.253184],
    [25.703822, 62.254551],
    [25.689711, 62.25623],
  ],
};

export function liveZoneSource(zones: readonly Zone[] = [LIVE_ZONE]): ZoneSource {
  return { list: async () => zones };
}

export const ALERT_FEED: AlertFeed = {
  radiusKm: 10,
  alerts: [
    {
      id: 'alert-1',
      zoneId: 'zone-a',
      zoneName: 'Laajavuori 22',
      species: 'bilberry',
      score: 71,
      confidence: 'high',
      ripeness: 'ripening',
      distanceMeters: 1800,
      latestReportAt: '2026-08-28T09:00:00.000Z',
      computedAt: '2026-08-28T09:30:00.000Z',
    },
  ],
};

export const SEASON = {
  year: 2026,
  visitCount: 3,
  reportCount: 3,
  zonesVisited: 3,
  stayHours: 3,
  medianMinutes: 60,
  harvestedKg: 4.5,
  kgPerHour: 1.5,
  harvestByReport: [
    {
      reportId: 'r1',
      zoneName: 'Laajavuori 9',
      kilograms: 1.5,
      recordedAt: '2026-08-20T08:45:00.000Z',
    },
    {
      reportId: 'r2',
      zoneName: 'Laajavuori 17',
      kilograms: 1.7,
      recordedAt: '2026-08-24T09:30:00.000Z',
    },
    {
      reportId: 'r3',
      zoneName: 'Laajavuori 14',
      kilograms: 1.3,
      recordedAt: '2026-08-28T10:55:00.000Z',
    },
  ],
};

export const OWN_REPORTS = [
  {
    id: 'r3',
    clientId: 'c3',
    zoneId: 'zone-14',
    zoneName: 'Laajavuori 14',
    species: 'lingonberry',
    rating: 4,
    amountKg: 1.3,
    minutes: 52,
    recordedAt: '2026-08-28T10:55:00.000Z',
  },
];
