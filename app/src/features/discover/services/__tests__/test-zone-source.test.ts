import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import payload from '../../../../../assets/data/test-zones.json';
import { testZoneSource } from '../test-zone-source';

/**
 * The stub the map draws, held to the file the other teams consume.
 *
 * The app bundles its own copy because Metro only serves what is inside the app package, and
 * a copy is the kind of thing that drifts: the data contract says consumers rely on the
 * columns of `data/test_zones.geojson` (docs/data-contract.md), so the day the data team
 * regenerates it, the app's copy has to move with it or this test fails.
 */

/** The published file, from the repository root (this file lives six levels down). */
const PUBLISHED = join(__dirname, '../../../../../..', 'data/test_zones.geojson');

describe('testZoneSource', () => {
  it('serves the 50 pilot zones with their geometry and scores', async () => {
    const zones = await testZoneSource.list({ species: 'bilberry' });

    expect(zones).toHaveLength(50);
    expect(new Set(zones.map((zone) => zone.id)).size).toBe(50);
    expect(zones.map((zone) => zone.name)).toContain('Laajavuori 1');
    for (const zone of zones) {
      expect(zone.ring.length).toBeGreaterThanOrEqual(3);
      expect(zone.score).toBeGreaterThanOrEqual(0);
      expect(zone.score).toBeLessThanOrEqual(100);
      expect(zone.confidence).toBeDefined();
      expect(zone.ripeness).toBeDefined();
      // The stub carries the instant its scores were computed, which is what the map's
      // “last updated” line prints. If the published file ever stops carrying it, the app's
      // copy should stop claiming a freshness it does not have.
      expect(zone.updatedAt).toBe('2026-08-03T07:02:00+03:00');
    }
  });

  it('can answer for every species the app names, from the payload’s own scores', async () => {
    const bilberry = await testZoneSource.list({ species: 'bilberry' });
    const lingonberry = await testZoneSource.list({ species: 'lingonberry' });

    // The same zones, each saying the berry the caller asked about — not one map's answer
    // relabelled as another's.
    expect(lingonberry.map((zone) => zone.id)).toEqual(bilberry.map((zone) => zone.id));
    expect(lingonberry.map((zone) => zone.score)).not.toEqual(bilberry.map((zone) => zone.score));
  });

  it('is the published file, not a copy that has drifted from it', () => {
    expect(JSON.parse(readFileSync(PUBLISHED, 'utf8'))).toEqual(payload);
  });
});
