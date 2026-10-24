import payload from '@/assets/data/test-zones.json';

import type { ZoneSource } from '../domain/zone-source';
import { parseZones } from '../domain/zone-source';

/**
 * The only `ZoneSource` the app has: the data team's 50-zone stub around Laajavuori
 * (`data/test_zones.geojson`, copied into `assets/data/test-zones.json` because Metro only
 * bundles what is inside the app package).
 *
 * **It is a stub, and the map says so.** Every feature carries `stub: true`; the scores are
 * the data team's stand-in, not pickers' reports, and the screen keeps the design's
 * “SEASON DEMO” disclosure and the caption “test data” for exactly that reason. The copy is
 * held equal to the published file by `services/__tests__/test-zone-source.test.ts`, so the
 * app cannot drift from the file the other teams consume (docs/data-contract.md).
 *
 * When the zone service answers (ADR-036 §2), an adapter for `GET /zones` replaces this one
 * and no screen changes: the map only knows the port.
 */
export const testZoneSource: ZoneSource = {
  list: async ({ species }) => parseZones(payload, species),
};
