import { en } from '@/services/i18n/locales/en';

import { filterZones } from '../zone-filter';
import { testZoneSource } from '../../services/test-zone-source';

/**
 * One place, two spellings of it: the map paints “Laajavuori” (node 5:22974) and the search
 * field has to find the zones by the same word.
 *
 * Since screen 06 reads the `ZoneSource`, the tie is between the catalogue's map label and the
 * **source's own zone names** — all fifty of the pilot stub's names begin with it. A drift
 * would leave the map naming one place over zones named another, and the field offering a
 * search its zone names do not answer to; no unit of either file would notice on its own.
 */
describe('the pilot area’s place', () => {
  it('is the word the map paints, and every source zone’s name starts with it', async () => {
    const painted = en['discover.map.place'];

    expect(painted).toBe('Laajavuori');

    const zones = await testZoneSource.list({ species: 'bilberry' });

    expect(zones).toHaveLength(50);
    for (const zone of zones) {
      expect(zone.name.startsWith(painted)).toBe(true);
    }
    // And the field finds all of them by that word, in the source's order.
    expect(filterZones(zones, { query: painted })).toEqual(zones);
  });
});
