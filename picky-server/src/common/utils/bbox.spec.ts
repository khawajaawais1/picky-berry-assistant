import { bboxKm, parseBbox } from './bbox';
import { buildEtag, matchesEtag } from './etag';
import { parseNumericInput } from './numeric-input';

describe('bbox helpers', () => {
  it('parses valid WGS84 bounds and computes dimensions', () => {
    const bbox = parseBbox('25.1,62.1,25.5,62.3');
    const dimensions = bboxKm(bbox);
    expect(dimensions.width).toBeGreaterThan(20);
    expect(dimensions.height).toBeCloseTo(22.264);
  });

  it('rejects invalid bounds', () => {
    expect(() => parseBbox('25,62,24,63')).toThrow();
    expect(() => parseBbox('25,62,26,91')).toThrow();
  });

  it('rejects empty numeric query values instead of coercing them to zero', () => {
    expect(parseNumericInput('')).toBeNaN();
  });
});

describe('ETag helpers', () => {
  it('builds stable weak tags and handles conditional request lists', () => {
    const tag = buildEtag(['bilberry', 'detail', '25,62,26,63', 10]);
    expect(buildEtag(['bilberry', 'detail', '25,62,26,63', 10])).toBe(tag);
    expect(matchesEtag(`"other", ${tag}`, tag)).toBe(true);
    expect(matchesEtag(undefined, tag)).toBe(false);
  });
});
