import { themes } from '@/constants/theme';

/**
 * The yield-score scale has to be read off a map, by eye, outdoors. Two things make that
 * possible: every band stands apart from the ground it is painted on, and each band stands apart
 * from the band next to it. Both are measured as CIELAB ΔE (CIE76), the distance a viewer
 * actually perceives, rather than as luminance alone — the low end of a sequential scale is
 * allowed to be light, as long as its hue tells it apart from the basemap.
 *
 * Thresholds: ΔE ≈ 2.3 is a just-noticeable difference; 20 is an obvious one at a glance.
 */
const BANDS = [
  'mapScoreLowest',
  'mapScoreLow',
  'mapScoreMid',
  'mapScoreHigh',
  'mapScoreHighest',
] as const;

function lab(hex: string): [number, number, number] {
  const channel = (index: number) => {
    const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [channel(0), channel(1), channel(2)];
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

describe.each(Object.entries(themes))('the %s map score palette', (_scheme, theme) => {
  const { colors } = theme;

  it.each(BANDS)('paints %s so it stands apart from the map it sits on', (band) => {
    expect(deltaE(colors[band], colors.mapBase)).toBeGreaterThanOrEqual(20);
  });

  it('keeps every band apart from the band next to it', () => {
    for (let index = 1; index < BANDS.length; index += 1) {
      expect(deltaE(colors[BANDS[index]!], colors[BANDS[index - 1]!])).toBeGreaterThanOrEqual(15);
    }
  });
});
