import { ALERT_CONFIDENCE, confidenceLabelKey, parseAlertFeed } from '../alert';

const ALERT = {
  id: 'a1',
  zone_id: 'z1',
  zone_name: 'Laajavuori 22',
  species: 'bilberry',
  score: 71,
  confidence: 'high',
  ripeness: 'ripening',
  distance_m: 1800,
  latest_report_at: '2026-08-28T09:00:00.000Z',
  computed_at: '2026-08-28T09:30:00.000Z',
};

describe('parseAlertFeed', () => {
  it('reads the API’s feed into the app’s alerts', () => {
    expect(parseAlertFeed({ radius_km: 10, alerts: [ALERT] })).toEqual({
      radiusKm: 10,
      alerts: [
        {
          id: 'a1',
          zoneId: 'z1',
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
    });
  });

  it('keeps an alert without a position or a report, and drops one it cannot read', () => {
    const feed = parseAlertFeed({
      radius_km: 5,
      alerts: [
        { ...ALERT, distance_m: null, latest_report_at: null },
        { ...ALERT, id: 'bad', species: 'strawberry' },
      ],
    });

    expect(feed?.alerts.map((alert) => alert.id)).toEqual(['a1']);
    expect(feed?.alerts[0]).toMatchObject({ distanceMeters: null, latestReportAt: null });
  });

  it('refuses a body that is not a feed', () => {
    expect(parseAlertFeed(null)).toBeNull();
    expect(parseAlertFeed({ alerts: 'none' })).toBeNull();
  });
});

describe('confidenceLabelKey', () => {
  it('names a confidence the way the zone screen names it', () => {
    expect(ALERT_CONFIDENCE.map(confidenceLabelKey)).toEqual([
      'discover.details.confidence.high',
      'discover.details.confidence.medium',
      'discover.details.confidence.low',
    ]);
  });
});
