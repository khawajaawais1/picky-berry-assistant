import type { SavedZone } from '@/services/saved-zones';

import { savedPlanSpecies, savedSpots, type SavedSpot } from '../saved-spots';
import type { Species } from '../species';
import { PILOT_ZONE_SPECIES, type Zone, type ZoneScore } from '../zone-source';

/**
 * What the plan's list can say about the zones it names.
 *
 * The screen behind frame 14's “Saved spots” row was never drawn (ADR-030), so this module is
 * where the app decides what it may show: the zones a `ZoneSource` answer for **the berry the
 * record holds**, in the order the picker saved them, and — for an identifier no answer carries
 * — the identifier itself rather than a silent gap. Since ADR-061 the record names its berry, so
 * the plan reads the same layer screen 07 was showing when the bookmark was pressed; a record
 * written before that has no layer, and is shown under the pilot berry the plan always used.
 *
 * The fixtures are source answers, not the design's demo zones: the plan reads the same port the
 * map does, so an id from the demo composition is just an id no answer carries.
 */

const RING: readonly (readonly [number, number])[] = [
  [25.689711, 62.25623],
  [25.69564, 62.253184],
  [25.703822, 62.254551],
  [25.689711, 62.25623],
];

const BILBERRY: ZoneScore = { score: 53, confidence: 'medium', ripeness: 'past' };
const LINGONBERRY: ZoneScore = { score: 70, confidence: 'high', ripeness: 'ripe' };

const zone = (id: string, name: string, score: ZoneScore): Zone => ({
  id,
  h3: `h3-${id}`,
  name,
  score: score.score,
  confidence: score.confidence,
  ripeness: score.ripeness,
  scores: { bilberry: BILBERRY, lingonberry: LINGONBERRY },
  ring: RING,
  updatedAt: '2026-08-03T07:02:00+03:00',
});

const zoneA = zone('zone-a', 'Laajavuori 1', BILBERRY);
const zoneB = zone('zone-b', 'Laajavuori 2', LINGONBERRY);

const ANSWERS: ReadonlyMap<Species, readonly Zone[]> = new Map([
  ['bilberry', [zoneA, zoneB]],
  [
    'lingonberry',
    [
      { ...zoneA, ...LINGONBERRY },
      { ...zoneB, ...LINGONBERRY },
    ],
  ],
]);

let savedAt = 0;

/** One record as the store keeps it, with its own moment so the order is legible. */
function record(zoneId: string, speciesId: string | null): SavedZone {
  savedAt += 1;

  return { savedAt: `2026-10-10T09:3${savedAt}:00.000Z`, speciesId, zoneId };
}

const kinds = (spots: readonly SavedSpot[]) => spots.map((spot) => spot.kind);

describe('the picker’s plan', () => {
  it('reads each saved zone from the answer for the berry it was saved under', () => {
    const spots = savedSpots(
      [record('zone-b', 'lingonberry'), record('zone-a', 'bilberry')],
      ANSWERS,
    );

    expect(spots).toEqual([
      { kind: 'zone', species: 'lingonberry', zone: expect.objectContaining({ id: 'zone-b' }) },
      { kind: 'zone', species: 'bilberry', zone: expect.objectContaining({ id: 'zone-a' }) },
    ]);
    // The figures belong to that berry's answer, not to whichever layer the map last read.
    const [lingonberry, bilberry] = spots;
    expect(lingonberry.kind === 'zone' && lingonberry.zone.score).toBe(70);
    expect(bilberry.kind === 'zone' && bilberry.zone.score).toBe(53);
  });

  it('names the berries the plan has to read, once each, in the record’s order', () => {
    expect(
      savedPlanSpecies([
        record('zone-a', 'lingonberry'),
        record('zone-b', 'lingonberry'),
        record('zone-c', 'cloudberry'),
      ]),
    ).toEqual(['lingonberry', 'cloudberry']);
  });

  it('shows a plan written before the berry was kept under the pilot layer', () => {
    // The record does not name a layer, so the plan shows what it showed before ADR-061 rather
    // than inventing a second berry: the pilot default is not a reading of the record, it is the
    // app's fallback, and it is what the bookmark wrote before there was a berry to write.
    expect(savedPlanSpecies([record('zone-a', null)])).toEqual([PILOT_ZONE_SPECIES]);
    expect(savedSpots([record('zone-a', null)], ANSWERS)).toEqual([
      { kind: 'zone', species: PILOT_ZONE_SPECIES, zone: zoneA },
    ]);
  });

  it('falls back to the pilot layer for a berry the app cannot name', () => {
    // A hand-edited value is external input: the domain refuses to read it as a species, the
    // storage layer cannot know the vocabulary, and the plan shows the layer it can.
    expect(savedPlanSpecies([record('zone-a', 'tomato')])).toEqual([PILOT_ZONE_SPECIES]);
    expect(kinds(savedSpots([record('zone-a', 'tomato')], ANSWERS))).toEqual(['zone']);
  });

  it('keeps a zone the source cannot describe, as the identifier the map would paint', () => {
    expect(savedSpots([record('Z99', 'bilberry')], ANSWERS)).toEqual([
      { kind: 'unknown', zoneId: 'Z99' },
    ]);
  });

  it('does not fall back to the design’s demo zones', () => {
    // The record may still hold an id saved before the plan read the source. It is not silently
    // resolved to a demo zone with that label: the row names the id, because the source is the
    // only thing that can describe a zone now (ADR-060).
    expect(savedSpots([record('Z14', null)], ANSWERS)).toEqual([
      { kind: 'unknown', zoneId: 'Z14' },
    ]);
  });

  it('keeps the plan’s own order when it mixes the two', () => {
    expect(
      kinds(
        savedSpots(
          [
            record('Z99', 'bilberry'),
            record('zone-a', 'lingonberry'),
            record('zone-b', 'bilberry'),
          ],
          ANSWERS,
        ),
      ),
    ).toEqual(['unknown', 'zone', 'zone']);
  });

  it('has nothing to list, and nothing to read, for an empty plan', () => {
    expect(savedSpots([], ANSWERS)).toEqual([]);
    expect(savedPlanSpecies([])).toEqual([]);
  });

  it('shows a repeated identifier the way the record holds it', () => {
    // `saveZone` writes a zone once, so a repeat can only have come from outside the app. It is
    // shown as the record has it rather than folded into one row, because the settings row counts
    // the same record: two rows and a count of two are the same plan, one row and a count of two
    // are not.
    expect(
      kinds(savedSpots([record('zone-a', 'bilberry'), record('zone-a', 'bilberry')], ANSWERS)),
    ).toEqual(['zone', 'zone']);
  });
});
