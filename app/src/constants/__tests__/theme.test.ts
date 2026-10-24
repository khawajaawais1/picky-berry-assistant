import { layout, radii, resolveColorScheme, spacing, themes, typography } from '../theme';

describe('resolveColorScheme', () => {
  it('keeps a supported scheme', () => {
    expect(resolveColorScheme('light')).toBe('light');
    expect(resolveColorScheme('dark')).toBe('dark');
  });

  it.each([null, undefined])('falls back to light for %s', (value) => {
    expect(resolveColorScheme(value)).toBe('light');
  });

  it('falls back to light for an unknown runtime value', () => {
    expect(resolveColorScheme('high-contrast' as never)).toBe('light');
  });
});

describe('design tokens', () => {
  it.each(['light', 'dark'] as const)(
    'defines a non-empty colour for every slot in %s',
    (scheme) => {
      const entries = Object.entries(themes[scheme].colors);
      expect(entries.length).toBeGreaterThan(0);
      for (const [name, value] of entries) {
        expect(`#${name}:${value}`).toMatch(/^#[a-zA-Z]+:#[0-9A-F]{6}$/i);
      }
    },
  );

  it('uses distinct backgrounds per scheme', () => {
    expect(themes.light.colors.background).not.toBe(themes.dark.colors.background);
  });

  it('keeps the spacing scale strictly increasing and duplicate-free', () => {
    const values = Object.values(spacing);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
  });

  it('defines every typography variant', () => {
    expect(Object.keys(typography).sort()).toEqual([
      'body',
      'bodySmall',
      'brand',
      'caption',
      'cardHeading',
      'cardLead',
      'cardTitle',
      'chip',
      'code',
      'headline',
      'heroTitle',
      'input',
      'label',
      'listingHeading',
      'mapAnnotation',
      'mapLabel',
      'message',
      'messageMeta',
      'metadata',
      'metric',
      'navLabel',
      'price',
      'priceLarge',
      'priceTotal',
      'profileInitials',
      'profileName',
      'rating',
      'ratingLabel',
      'rowTitle',
      'rowValue',
      'sectionHeading',
      'stat',
      'statusLabel',
      'subtitle',
      'timer',
      'title',
    ]);
  });
});

describe('design-sourced tokens (Figma file “Picky”, extracted 2026-10-08)', () => {
  it('uses the design’s named palette in light mode', () => {
    expect(themes.light.colors).toMatchObject({
      background: '#F5F7F8', // Mist
      surface: '#FFFFFF',
      border: '#DDE5E5',
      text: '#182B30', // Ink
      textMuted: '#596C70',
      accent: '#414BA0', // Blueberry
      onAccent: '#FFFFFF',
      success: '#28654E', // Forest
    });
  });

  it('keeps the design’s tinted surfaces for selected and success states', () => {
    expect(themes.light.colors).toMatchObject({
      accentMuted: '#EAECFA',
      successMuted: '#E4F0E7',
      warningMuted: '#F5EBD8',
    });
  });

  it('exposes every colour slot in both schemes', () => {
    const light = Object.keys(themes.light.colors).sort();
    const dark = Object.keys(themes.dark.colors).sort();
    expect(dark).toEqual(light);
  });

  it('uses the design’s 12 px gap step alongside the 4 pt scale', () => {
    expect(spacing.gap).toBe(12);
    expect(spacing).toMatchObject({ xs: 4, sm: 8, md: 16, lg: 24 });
  });

  it('uses the design’s 18 px card radius', () => {
    expect(radii.lg).toBe(18);
  });

  it('matches the design’s measured type metrics', () => {
    expect(typography.title).toMatchObject({ fontSize: 28, lineHeight: 39 });
    expect(typography.subtitle).toMatchObject({ fontSize: 20, lineHeight: 28 });
    expect(typography.body).toMatchObject({ fontSize: 16, lineHeight: 22 });
    expect(typography.label).toMatchObject({ fontSize: 13, lineHeight: 16, fontWeight: '600' });
    expect(typography.metadata).toMatchObject({ fontSize: 12, lineHeight: 17, fontWeight: '400' });
  });

  it('matches the type metrics of screen 01 (Onboarding · Welcome, node 5:22710)', () => {
    // The design sets 140 % line height deliberately on these; Figma 'auto' heights
    // (the wordmark at 42/50.83) are rounded to the nearest whole pixel.
    expect(typography.chip).toMatchObject({ fontSize: 10, lineHeight: 14, fontWeight: '600' });
    expect(typography.bodySmall).toMatchObject({ fontSize: 14, lineHeight: 20, fontWeight: '400' });
    expect(typography.headline).toMatchObject({ fontSize: 30, lineHeight: 42, fontWeight: '400' });
    expect(typography.brand).toMatchObject({ fontSize: 42, lineHeight: 51, fontWeight: '700' });
  });

  it('carries the design’s 10 px control radius and 54 px action height', () => {
    expect(radii.control).toBe(10);
    expect(layout.actionHeight).toBe(54);
  });

  it('carries the frame’s 18 px section gap and 64 px header height', () => {
    expect(spacing.section).toBe(18);
    expect(layout.headerHeight).toBe(64);
  });

  it('carries screen 03’s field padding, chip height and label gaps', () => {
    // Frame 03 (Onboarding · Create account, node 5:22788): inputs and the status
    // row are inset 14 px, its choice chips are 36 px tall, a field's label sits
    // 7 px above its input and the two-line text stacks are set 3 px apart.
    expect(spacing.field).toBe(14);
    expect(layout.chipHeight).toBe(36);
    expect(spacing.label).toBe(7);
    expect(spacing.tight).toBe(3);
  });

  it('carries screen 05’s card title metrics and card gap', () => {
    // Frame 05 (Onboarding · Location consent, node 5:22885): the row titles inside its
    // benefits card are 15/21 semibold, and the card's two rows sit 10 px apart.
    expect(typography.cardTitle).toMatchObject({ fontSize: 15, lineHeight: 21, fontWeight: '600' });
    expect(spacing.cardGap).toBe(10);
  });

  it('carries screen 14’s settings-row padding and its row values', () => {
    // Frame 14 (Account and offline · Profile and privacy, node 5:23613): each `Setting`
    // row in its settings card is padded 6 px top and bottom — the same value on all six
    // rows, which is what makes it a token rather than a one-off layout choice — and the
    // value at the row's end is 14/17 semibold (“1 queued”, node 5:23673).
    expect(spacing.setting).toBe(6);
    expect(typography.rowValue).toMatchObject({ fontSize: 14, lineHeight: 17, fontWeight: '600' });
  });

  it('carries the account row’s own metrics', () => {
    // The frame's profile row: a 62 px avatar (node 5:23627) whose monogram is 23/27.8 regular
    // (5:23628), the account's name at 21/29.4 (5:23630), and its identifier line in the
    // existing 13/18 caption slot (5:23631).
    expect(layout.avatarSize).toBe(62);
    expect(typography.profileInitials).toMatchObject({
      fontSize: 23,
      lineHeight: 28,
      fontWeight: '400',
    });
    expect(typography.profileName).toMatchObject({
      fontSize: 21,
      lineHeight: 29,
      fontWeight: '400',
    });
  });

  it('carries the core navigation’s bar, item, pill, glyph and label metrics', () => {
    // Frames 06–14 (node `5:23012`): a 390x78 bar above the home area, four 90x51 items,
    // the current one marked by a 60x32 pill at the pill radius, a 22 px glyph and a 12/15
    // label. The bar and the item are floors, not caps: at the largest system text size the
    // label needs more than 51 px and the design's height would cut it off (ADR-019).
    expect(layout.navHeight).toBe(78);
    expect(layout.navItemHeight).toBe(51);
    expect(layout.navIndicatorWidth).toBe(60);
    expect(layout.navIndicatorHeight).toBe(32);
    expect(layout.navIcon).toBe(22);
    expect(typography.navLabel).toMatchObject({ fontSize: 12, lineHeight: 15, fontWeight: '400' });
    expect(layout.navItemHeight).toBeGreaterThanOrEqual(layout.minTouchTarget);
  });

  it('keeps the symbol tile the sign-in screen draws', () => {
    // Frame 04's 76 px tile, drawn by the app's own sign-in screen as its key tile. Screen 04's
    // code cells and digit are gone with the screen (ADR-059), and their metrics went with them.
    expect(layout.symbolTile).toBe(76);
  });

  it('carries screen 06’s map metrics, its card heading and its map type', () => {
    // Frame 06 (Core picker · Discover map, node 5:22942): a 342x300 map at the card
    // radius, an 8x8 legend swatch at a 2 px corner, a 19/27 card heading, 15/21 input
    // text and the two small sizes the map's own words are set in.
    expect(layout.mapHeight).toBe(300);
    expect(layout.mapLegendSwatch).toBe(8);
    expect(radii.xs).toBe(2);
    expect(typography.cardHeading).toMatchObject({ fontSize: 19, lineHeight: 27 });
    expect(typography.input).toMatchObject({ fontSize: 15, lineHeight: 21 });
    expect(typography.mapLabel).toMatchObject({ fontSize: 12, lineHeight: 15 });
    expect(typography.mapAnnotation).toMatchObject({ fontSize: 10, lineHeight: 12 });
  });

  it('carries frame 07’s hero metric, section heading and photograph height', () => {
    // Frame 07 (Core picker · Zone details, node 5:23032): the yield card's “78” is set at
    // 50/60.5 and the sections' headings at 18/25.2 (“Today's outlook”) and 17/23.8
    // (“Fresh from pickers”), which the app keeps as one 18/25 slot; the season
    // photograph above them is 342x154 at the card radius (node 5:23046).
    expect(typography.metric).toMatchObject({ fontSize: 50, lineHeight: 61 });
    expect(typography.sectionHeading).toMatchObject({ fontSize: 18, lineHeight: 25 });
    expect(layout.zonePhotoHeight).toBe(154);
  });

  it('keeps frame 06’s zone fills as the frame paints them, composited onto the woodland', () => {
    // The frame draws each polygon as a 50 % tint over the map's woodland (#CCDDBE), and
    // the app paints the same result opaquely: #91BCAF, #AFB6CD and #EACD91 over it.
    expect(themes.light.colors.mapBase).toBe('#E6EEDD');
    expect(themes.light.colors.mapWoodland).toBe('#CCDDBE');
    expect(themes.light.colors.mapZoneUnpicked).toBe('#AFCDB7');
    expect(themes.light.colors.mapZoneRecent).toBe('#BECAC6');
    expect(themes.light.colors.mapZoneRipening).toBe('#DBD5A8');
  });

  it('carries frame 08’s route metrics: its map height, its stat and its row title', () => {
    // Frame 08 (Core picker · Route to zone, node 5:23106): the same map as frame 06 drawn
    // 342x322, a card whose two values are 27/37.8 over their labels, and the guidance row's
    // title at 17/23.8 semibold.
    expect(layout.routeMapHeight).toBe(322);
    expect(typography.stat).toMatchObject({ fontSize: 27, lineHeight: 38 });
    expect(typography.rowTitle).toMatchObject({ fontSize: 17, lineHeight: 24, fontWeight: '600' });
  });

  it('carries frame 09’s visit metrics: its map height, its status label and its timer', () => {
    // Frame 09 (Core picker · Active visit, node 5:23185): the same map as frame 06 drawn
    // 342x210, the timer card's label at 12/16.8 semibold and its elapsed reading at 52/62.9
    // semibold, and the card's own 20 px inset with its lines 6 px apart.
    expect(layout.visitMapHeight).toBe(210);
    expect(typography.statusLabel).toMatchObject({
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    });
    expect(typography.timer).toMatchObject({ fontSize: 52, lineHeight: 63, fontWeight: '600' });
    expect(spacing.cardInset).toBe(20);
  });

  it('carries frame 10’s rating metrics: its cell height and both of its type slots', () => {
    // Frame 10 (Core picker · Post-visit feedback, node 5:23259): five 63x72 cells 7 px apart,
    // each holding a 24/29 number over an 11/13.3 word (“None” … “Lots”).
    expect(layout.ratingCellHeight).toBe(72);
    expect(typography.rating).toMatchObject({ fontSize: 24, lineHeight: 29, fontWeight: '400' });
    expect(typography.ratingLabel).toMatchObject({
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '500',
    });
    expect(spacing.label).toBe(7);
  });

  it('carries frame 12’s alert headline metrics', () => {
    // Frame 12 (Core picker · Alerts and forecast, node 5:23439): the alert's own headline is set
    // at 24/33.6 regular (node 5:23456), over a 12/16.8 stamp and a 13/18.2 context line.
    expect(typography.heroTitle).toMatchObject({ fontSize: 24, lineHeight: 34, fontWeight: '400' });
  });

  it('carries the switch metrics of frame 12’s preferences card (node 5:23485)', () => {
    // 46x28 with a 22 px thumb, fully rounded. It is the only switch the design draws, and it is
    // drawn on a card the screen labels as its own sample — so the metrics are here and the
    // behaviour deliberately is not (ADR-043).
    expect(layout.switchWidth).toBe(46);
    expect(layout.switchHeight).toBe(28);
    expect(layout.switchThumb).toBe(22);
  });

  it('carries frame 11’s chart metrics: its bar width, its bar gap and its type slots', () => {
    // Frame 11 (Core picker · Visits and analytics, node 5:23343): three bars 44 px wide and
    // 28 px apart in a 306x108 chart, each a 12/14.5 value over the bar and an 11/13.3 date
    // under it, with the summary card's figures set at 27/37.8 over 12/16.8 labels.
    expect(layout.harvestBarWidth).toBe(44);
    expect(spacing.chart).toBe(28);
    expect(typography.metadata).toMatchObject({ fontSize: 12, lineHeight: 17 });
    expect(typography.ratingLabel).toMatchObject({ fontSize: 11, lineHeight: 13 });
    expect(typography.stat).toMatchObject({ fontSize: 27, lineHeight: 38 });
    expect(typography.sectionHeading).toMatchObject({ fontSize: 18, lineHeight: 25 });
  });

  it('carries the minimum touch target the design’s controls are built on', () => {
    // Screen 03's back control is a 32x44 frame; 44 px is the smallest comfortable
    // target, and the consent glyph grows to it with hit slop.
    expect(layout.minTouchTarget).toBe(44);
  });
});
