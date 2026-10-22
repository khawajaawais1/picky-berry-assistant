import { formatClockTime, formatElapsed, DEMO_ACTIVE_VISIT } from '../active-visit';
import { CARD_ZONE_STATE, DEMO_ZONES } from '../zone';
import { DEMO_ZONE_DETAILS } from '../zone-details';

describe('formatElapsed', () => {
  it('prints the frame’s own reading, zero-padded to hours:minutes:seconds', () => {
    // Frame 09 draws “00:42:17” (node 5:23226) for the time this picker has been in the zone.
    expect(formatElapsed(42 * 60_000 + 17_000)).toBe('00:42:17');
  });

  it('counts up from zero', () => {
    expect(formatElapsed(0)).toBe('00:00:00');
    expect(formatElapsed(1_000)).toBe('00:00:01');
    expect(formatElapsed(59_000)).toBe('00:00:59');
    expect(formatElapsed(60_000)).toBe('00:01:00');
    expect(formatElapsed(60 * 60_000)).toBe('01:00:00');
  });

  it('keeps counting past a day, because a visit may span one', () => {
    expect(formatElapsed(100 * 60 * 60_000 + 3_000)).toBe('100:00:03');
  });

  it('truncates part-seconds rather than rounding them, so the reading never jumps ahead', () => {
    expect(formatElapsed(1_900)).toBe('00:00:01');
  });

  it('refuses a duration that is not a non-negative number of milliseconds', () => {
    expect(() => formatElapsed(-1)).toThrow(RangeError);
    expect(() => formatElapsed(Number.NaN)).toThrow(RangeError);
    expect(() => formatElapsed(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('formatClockTime', () => {
  it('prints the wall clock as the frame prints it (10:03)', () => {
    // Built from local components on purpose: the reading is the device's own clock, so the
    // test must not depend on the machine's timezone.
    expect(formatClockTime(new Date(2026, 7, 28, 10, 3, 0).getTime())).toBe('10:03');
  });

  it('pads both halves to two digits', () => {
    expect(formatClockTime(new Date(2026, 7, 28, 9, 5, 0).getTime())).toBe('09:05');
    expect(formatClockTime(new Date(2026, 7, 28, 0, 0, 0).getTime())).toBe('00:00');
  });
});

describe('DEMO_ACTIVE_VISIT', () => {
  it('is the frame’s own sample, on the demo zone frames 06–08 tell their story about', () => {
    // The frame draws “Picking in Zone 14”, “ACTIVE · LINGONBERRY”, “00:42:17” and its status
    // message says the picker arrived at 10:03 — 42:17 before the reading it shows.
    expect(DEMO_ACTIVE_VISIT.zoneId).toBe(DEMO_ZONE_DETAILS.zoneId);
    expect(DEMO_ACTIVE_VISIT.elapsedMs).toBe(42 * 60_000 + 17_000);
  });

  it('names the zone frame 09’s title spells out (“Picking in Zone 14”)', () => {
    const cardZone = DEMO_ZONES.find((zone) => zone.state === CARD_ZONE_STATE);

    expect(DEMO_ZONE_DETAILS.zoneId).toBe(cardZone?.id);
    expect(cardZone?.number).toBe('14');
  });
});
