import { en } from '@/services/i18n/locales/en';

import { DEMO_ZONES } from '../zone';
import { filterZones } from '../zone-filter';

/**
 * One zone, two spellings of its place: the frame paints “Laajavuori” on its map (node
 * 5:22974) and the search field has to find the zone by the same word.
 *
 * The two live in different places — the label in the catalogue, the searchable value in the
 * demo zones — so this is the test that keeps them one word. A drift would leave the field
 * offering to search a place whose name no zone answers to, which is a promise the screen
 * cannot keep and no unit of either file would notice on its own.
 */
describe('a demo zone’s place', () => {
  it('is the word the map paints, and the search field finds the zone by it', () => {
    const painted = en['discover.map.place'];

    expect(painted).toBe('Laajavuori');
    expect(DEMO_ZONES.find((zone) => zone.place === painted)?.id).toBe('Z14');
    expect(filterZones(DEMO_ZONES, { query: painted, species: [] }).map((zone) => zone.id)).toEqual(
      ['Z14'],
    );
  });
});
