import type { Zone } from '../zone-source';
import { zoneTrackingPolygons } from '../zone-tracking';

/**
 * The zones as the visit tracker reads them (ADR-066): the same rings the map draws, as
 * latitude/longitude points, keyed by the zone id `POST /visits` takes.
 */
const ZONE: Zone = {
  id: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
  h3: '8811250e25fffff',
  name: 'Laajavuori 1',
  score: 53,
  confidence: 'medium',
  ripeness: 'past',
  scores: {},
  ring: [
    [25.689711, 62.25623],
    [25.69564, 62.253184],
    [25.703822, 62.254551],
    [25.689711, 62.25623],
  ],
  updatedAt: null,
};

describe('zoneTrackingPolygons', () => {
  it('turns each ring’s [longitude, latitude] pairs into the tracker’s points', () => {
    expect(zoneTrackingPolygons([ZONE])).toEqual([
      {
        id: ZONE.id,
        ring: [
          { latitude: 62.25623, longitude: 25.689711 },
          { latitude: 62.253184, longitude: 25.69564 },
          { latitude: 62.254551, longitude: 25.703822 },
          { latitude: 62.25623, longitude: 25.689711 },
        ],
      },
    ]);
  });

  it('answers the same list for the same zones, so the tracker is not handed a new one each render', () => {
    const zones = [ZONE];

    expect(zoneTrackingPolygons(zones)).toBe(zoneTrackingPolygons(zones));
  });
});
