import { presenceSamplesFor } from '../position-presence';

/**
 * The rule that turns the device's own containment answers into the samples the visit tracker
 * consumes (ADR-045). It is the join between the two things the app already had and could not
 * connect: a position (now readable through the port in `src/services/location`) and the visit
 * lifecycle (`visit-lifecycle.ts`, which takes `ZonePresenceSample`s and has never been fed one
 * outside its own tests).
 *
 * The one rule that matters and is asserted below: **what the picker left is closed before what
 * they entered is opened.** The tracker holds one open visit per zone and closes a segment on the
 * first `inside: false`, so the order of the two samples decides whether walking from one zone
 * into the next is a departure and an arrival instead of an arrival into a zone that was never
 * left.
 */
describe('presenceSamplesFor', () => {
  const at = 1_780_000_000_000;

  it('counts a fix inside the same zone as evidence of presence', () => {
    expect(presenceSamplesFor('Z14', 'Z14', at)).toEqual([{ at, inside: true, zoneId: 'Z14' }]);
  });

  it('closes the zone it left before it opens the one it entered', () => {
    expect(presenceSamplesFor('Z14', 'Z09', at)).toEqual([
      { at, inside: false, zoneId: 'Z14' },
      { at, inside: true, zoneId: 'Z09' },
    ]);
  });

  it('closes a zone the picker walked out of', () => {
    expect(presenceSamplesFor('Z14', null, at)).toEqual([{ at, inside: false, zoneId: 'Z14' }]);
  });

  it('opens a zone the picker walked into', () => {
    expect(presenceSamplesFor(null, 'Z14', at)).toEqual([{ at, inside: true, zoneId: 'Z14' }]);
  });

  it('has nothing to report while a fix is outside every zone, and stays outside', () => {
    // No zone was entered or left, so there is no evidence to hand the tracker: a sample that
    // says “outside Z14” when the picker was never in Z14 would close a visit they never had.
    expect(presenceSamplesFor(null, null, at)).toEqual([]);
  });

  it('carries the instant of the observation rather than the moment it was applied', () => {
    expect(presenceSamplesFor('Z14', 'Z14', 1)[0]?.at).toBe(1);
  });
});
