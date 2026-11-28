import { helsinkiWindowBounds } from './dates';

describe('helsinkiWindowBounds', () => {
  it('uses Helsinki calendar days across the autumn clock change', () => {
    const bounds = helsinkiWindowBounds(
      3,
      new Date('2026-10-25T10:00:00.000Z'),
    );

    expect(bounds).toMatchObject({
      fromDay: '2026-10-23',
      toDay: '2026-10-25',
      start: new Date('2026-10-22T21:00:00.000Z'),
      end: new Date('2026-10-25T22:00:00.000Z'),
    });
    expect(bounds.end.getTime() - bounds.start.getTime()).toBe(
      73 * 60 * 60 * 1000,
    );
  });
});
