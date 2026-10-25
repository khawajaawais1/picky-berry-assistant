import { themes, type ThemeColors } from '../theme';

/**
 * Accessibility is a product requirement (AGENTS.md §11), and readable text is the
 * part of it that a test can hold. This checks every foreground/background pair the
 * app can actually paint, in both colour schemes, against the WCAG 2.1 AA contrast
 * minimum that EN 301 549 — the EAA's harmonised standard — incorporates.
 *
 * The pairs are enumerated by where the app uses them rather than as a full matrix:
 * a pair the palette *could* produce but no component renders is not a defect, and a
 * pair that ships unreadably is. `AppText` can paint any tone, so every tone is
 * checked against the surfaces the screens and components use as backgrounds.
 *
 * WCAG 1.4.3: 4.5:1 for normal text, 3:1 for large text. Every tone in the palette is
 * used at body size or smaller today, so 4.5:1 applies to all of them; the display
 * sizes are checked at 3:1 when a screen uses them on a tinted background.
 */
const NORMAL_TEXT_MIN = 4.5;

type Pair = {
  /** Where this combination is painted, so a failure names the screen it breaks. */
  used: string;
  foreground: keyof ThemeColors;
  background: keyof ThemeColors;
  min: number;
};

const PAIRS: readonly Pair[] = [
  {
    used: 'body copy on the page',
    foreground: 'text',
    background: 'background',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'field values, card and list copy on a surface',
    foreground: 'text',
    background: 'surface',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'supporting copy on the page',
    foreground: 'textMuted',
    background: 'background',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'supporting copy on a surface',
    foreground: 'textMuted',
    background: 'surface',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'screen heading on the page (large)',
    foreground: 'text',
    background: 'background',
    min: 3,
  },
  {
    used: 'links and eyebrows on the page',
    foreground: 'accent',
    background: 'background',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'text actions on a surface',
    foreground: 'accent',
    background: 'surface',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'primary action label on the accent fill',
    foreground: 'onAccent',
    background: 'accent',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'promise tags and success copy on the page',
    foreground: 'success',
    background: 'background',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'success copy on a surface',
    foreground: 'success',
    background: 'surface',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'callout and note title on a success tint',
    foreground: 'text',
    background: 'successMuted',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'callout and note body on a success tint',
    foreground: 'textMuted',
    background: 'successMuted',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'warning copy on the page',
    foreground: 'warning',
    background: 'background',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'failure copy on the page',
    foreground: 'danger',
    background: 'background',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'failure copy on a surface',
    foreground: 'danger',
    background: 'surface',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'warning copy on a warning tint',
    foreground: 'warning',
    background: 'warningMuted',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'callout and note title on a warning tint (screen 10’s offline note)',
    foreground: 'text',
    background: 'warningMuted',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'callout and note body on a warning tint (screen 10’s offline note)',
    foreground: 'textMuted',
    background: 'warningMuted',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'the confidence chip’s label on its success tint (screen 06’s zone card)',
    foreground: 'success',
    background: 'successMuted',
    min: NORMAL_TEXT_MIN,
  },
  {
    // Frames 06–14's core navigation marks the current destination with an accent label inside a
    // pill on the accent tint (node 5:23014). Both are 12 px text, so AA's body minimum applies.
    used: 'the current destination’s label and glyph on their tint (the core navigation)',
    foreground: 'accent',
    background: 'accentMuted',
    min: NORMAL_TEXT_MIN,
  },
  // Frame 06's map (node 5:22966). Its annotations are painted on the map itself, so these
  // are the pairs the drawing produces; the frame's own values for four of them did not
  // clear AA and are darkened in the palette, with the measurements recorded in
  // docs/design-source.md.
  {
    used: 'the place name on the map (screen 06)',
    foreground: 'success',
    background: 'mapWoodland',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'the map’s scale line on the map (screen 06)',
    foreground: 'mapNote',
    background: 'mapWoodland',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'the lake’s name on the water (screen 06)',
    foreground: 'mapLakeLabel',
    background: 'mapWater',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'a recently picked zone’s name on its own fill (screen 06)',
    foreground: 'mapZoneRecentLabel',
    background: 'mapZoneRecent',
    min: NORMAL_TEXT_MIN,
  },
  {
    used: 'a ripening zone’s name on its own fill (screen 06)',
    foreground: 'mapZoneRipeningLabel',
    background: 'mapZoneRipening',
    min: NORMAL_TEXT_MIN,
  },
  // The legend's swatches and the zone outlines are graphics rather than text: WCAG 1.4.11
  // asks for 3:1, because a swatch the reader cannot see cannot name a state.
  {
    used: 'the unpicked legend swatch on the page (screen 06)',
    foreground: 'success',
    background: 'background',
    min: 3,
  },
  {
    used: 'the recently picked legend swatch on the page (screen 06)',
    foreground: 'mapZoneRecentLine',
    background: 'background',
    min: 3,
  },
  {
    used: 'the ripening legend swatch on the page (screen 06)',
    foreground: 'warning',
    background: 'background',
    min: 3,
  },
  {
    used: 'the recently picked outline against its own zone fill (screen 06)',
    foreground: 'mapZoneRecentLine',
    background: 'mapZoneRecent',
    min: 3,
  },
  {
    // Screen 07's outlook line leads with a sun glyph. The sentence beside it carries the
    // meaning in words, but a glyph the reader cannot see is not a glyph, so it is held to
    // the same 3:1 as the legend's swatches.
    used: 'the sun glyph in the outlook line (screen 07)',
    foreground: 'warning',
    background: 'surface',
    min: 3,
  },
];

function channel(value: number): number {
  const ratio = value / 255;

  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a `#RRGGBB` colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two `#RRGGBB` colours (order does not matter). */
function contrast(one: string, other: string): number {
  const [lighter, darker] = [luminance(one), luminance(other)].sort((a, b) => b - a);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('the contrast measure itself', () => {
  it('matches the WCAG reference ratio for black on white', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('reports 1:1 for a colour against itself, and is symmetric', () => {
    expect(contrast('#414BA0', '#414BA0')).toBe(1);
    expect(contrast('#182B30', '#F5F7F8')).toBeCloseTo(contrast('#F5F7F8', '#182B30'), 10);
  });

  it('fails a pair that is genuinely unreadable, so the checks above can fail', () => {
    // Mid grey on white, the classic unreadable combination: ~2.8:1.
    expect(contrast('#999999', '#FFFFFF')).toBeLessThan(NORMAL_TEXT_MIN);
  });
});

describe.each(['light', 'dark'] as const)('colour contrast in %s mode', (scheme) => {
  const colors = themes[scheme].colors;

  // The measured value is asserted unrounded: rounding a 4.499 pair up to 4.5 would
  // be a check that passes by arithmetic rather than by contrast.
  it.each(PAIRS)('$used reaches $min:1', ({ foreground, background, min }) => {
    expect(contrast(colors[foreground], colors[background])).toBeGreaterThanOrEqual(min);
  });

  it('defines every colour as a six-digit hex value', () => {
    for (const [name, value] of Object.entries(colors)) {
      expect(`${name}:${value}`).toMatch(/^[a-zA-Z]+:#[0-9A-F]{6}$/i);
    }
  });
});
