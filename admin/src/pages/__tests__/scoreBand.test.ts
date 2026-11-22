import { describe, expect, it } from 'vitest';
import { scoreBand } from '../MapPage';

describe('scoreBand', () => {
  it.each([
    [null, 'none'],
    [0, 'bad'],
    [44, 'bad'],
    [45, 'warn'],
    [69, 'warn'],
    [70, 'good'],
    [100, 'good'],
  ] as const)('puts %s in the %s band, matching ScorePill', (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });
});
