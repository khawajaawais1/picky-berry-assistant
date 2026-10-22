import { savedSpots } from '../saved-spots';

/**
 * What the plan's list can say about the zones it names.
 *
 * The screen behind frame 14's “Saved spots” row was never drawn (ADR-030), so this module is
 * where the app decides what it may show: the zones it knows, in the order the picker saved them,
 * and — for an identifier no zone answers to — the identifier itself rather than a silent gap.
 * A plan that listed two of the picker's three saved zones would be worse than a plan that says
 * what it cannot describe, and it would disagree with the count the settings row prints over the
 * same record.
 */
describe('the picker’s plan', () => {
  it('names the zones the app knows, in the order they were saved', () => {
    expect(savedSpots(['Z21', 'Z14'])).toEqual([
      { kind: 'zone', zone: expect.objectContaining({ id: 'Z21' }) },
      { kind: 'zone', zone: expect.objectContaining({ id: 'Z14' }) },
    ]);
  });

  it('keeps a zone the app cannot describe, as the identifier the map would paint', () => {
    // A stored identifier from another version of the app, or from a zone source that has not
    // landed: the plan is the picker's own record, so the row says what the record says.
    expect(savedSpots(['Z99'])).toEqual([{ kind: 'unknown', zoneId: 'Z99' }]);
  });

  it('keeps the plan’s own order when it mixes the two', () => {
    expect(savedSpots(['Z99', 'Z14', 'Z09']).map((spot) => spot.kind)).toEqual([
      'unknown',
      'zone',
      'zone',
    ]);
  });

  it('has nothing to list for an empty plan', () => {
    expect(savedSpots([])).toEqual([]);
  });

  it('shows a repeated identifier the way the record holds it', () => {
    // `saveZone` writes a zone once, so a repeat can only have come from outside the app. It is
    // shown as the record has it rather than folded into one row, because the settings row counts
    // the same record: two rows and a count of two are the same plan, one row and a count of two
    // are not.
    expect(savedSpots(['Z14', 'Z14']).map((spot) => spot.kind)).toEqual(['zone', 'zone']);
  });
});
