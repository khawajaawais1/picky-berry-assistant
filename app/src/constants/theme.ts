import { Platform, type TextStyle } from 'react-native';

/**
 * Design tokens for Picky mobile.
 *
 * Rules:
 * - UI code must not hard-code colour, spacing, radius or font values; it reads
 *   them from here so a visual change stays a one-file change.
 * - Tokens are plain data with no React dependency, so they can be unit tested
 *   and reused outside the component tree (navigation theming, tests, tooling).
 *
 * Provenance: the light palette, spacing, radii and type metrics are **extracted
 * from the Figma design file** (see docs/design-source.md), which names its colours
 * Blueberry #414BA0, Forest #28654E, Mist #F5F7F8 and Ink #182B30. Values the design
 * does not define — dark mode, `danger`, the neutral `surfaceMuted` — are app-side
 * and are marked as such below; do not present them as design-sourced.
 */

export type ColorSchemeName = 'light' | 'dark';

export type ThemeColors = {
  /** App background. */
  background: string;
  /** Raised surfaces: cards, sheets. */
  surface: string;
  /** Secondary text/fill inside a surface. */
  surfaceMuted: string;
  border: string;
  /** Primary body text. */
  text: string;
  /** Secondary text, must stay readable on `background` and `surface`. */
  textMuted: string;
  /** Brand/action colour. */
  accent: string;
  /** The berry mark's deeper shade, measured from the design's mark node. */
  berryDeep: string;
  /** Foreground used on top of `accent`. */
  onAccent: string;
  /** Tinted accent surface: selected chips, highlight rows (design tint). */
  accentMuted: string;
  /** Tinted success surface (design tint). */
  successMuted: string;
  /** Tinted warning surface (design tint). */
  warningMuted: string;
  danger: string;
  success: string;
  warning: string;
  /**
   * The map frame's own fill, which shows through wherever the woodland path does not
   * reach (node 5:22966): a lighter green than the woodland itself, and a large part of the
   * design's map rather than a sliver — it is the ground the drawing sits on.
   */
  mapBase: string;
  /** The map's woodland, measured on frame 06 (`Woodlands`, 5:22967). */
  mapWoodland: string;
  /** The lake fill on frame 06 (`Lake shore`, 5:22968). */
  mapWater: string;
  /** The 6 px light casing drawn under the forest trails (`Forest trails`, 5:22969). */
  mapTrail: string;
  /** The trail centrelines (`Trail centerlines`, 5:22970). */
  mapTrailLine: string;
  /**
   * The three zone fills. The frame draws each polygon as a tint at 50 % over the
   * woodland base, so the painted colour is that tint composited onto `mapWoodland` —
   * an opaque value, because the app draws the same result without a blend mode.
   */
  mapZoneUnpicked: string;
  mapZoneRecent: string;
  mapZoneRipening: string;
  /**
   * The “Recently picked” zone's 2 px outline. The frame's `#7683A6` reaches only 2.2:1
   * against its own fill, below the 3:1 a non-text graphic needs (WCAG 1.4.11); this is
   * the nearest darker value from the same hue that clears it, and the legend swatch that
   * names the state uses the same token.
   */
  mapZoneRecentLine: string;
  /** The map's own small print (scale, and notes painted on the map). */
  mapNote: string;
  /** The lake's name, darkened from the frame's `#456D78` to clear AA on the water. */
  mapLakeLabel: string;
  /** A zone's own name, darkened from the frame's `#53627F` for the same reason. */
  mapZoneRecentLabel: string;
  /** The ripening zone's name, darkened from the frame's `#855C25` for the same reason. */
  mapZoneRipeningLabel: string;
  /**
   * The five yield-score bands the real map paints (`ZONE_SCORE_BANDS`): a sequential
   * green scale, darker as the score rises, so the map reads as one quantity rather than
   * five unrelated categories. The `…Line` token is each band's boundary, a darker step of
   * the same hue. App-side: the design draws three zone *states*, not a score scale.
   */
  mapScoreLowest: string;
  mapScoreLowestLine: string;
  mapScoreLow: string;
  mapScoreLowLine: string;
  mapScoreMid: string;
  mapScoreMidLine: string;
  mapScoreHigh: string;
  mapScoreHighLine: string;
  mapScoreHighest: string;
  mapScoreHighestLine: string;
};

export type Theme = {
  scheme: ColorSchemeName;
  colors: ThemeColors;
};

/** Extracted from the design file: Mist background, white surfaces, Ink text. */
const lightColors: ThemeColors = {
  background: '#F5F7F8',
  surface: '#FFFFFF',
  surfaceMuted: '#E7EDE9', // app-side: the design uses tints, not neutral fills
  border: '#DDE5E5',
  text: '#182B30',
  textMuted: '#596C70',
  accent: '#414BA0',
  berryDeep: '#303A84',
  onAccent: '#FFFFFF',
  accentMuted: '#EAECFA',
  successMuted: '#E4F0E7',
  warningMuted: '#F5EBD8',
  danger: '#B3261E', // app-side: the design defines no destructive colour yet
  success: '#28654E',
  warning: '#855C25',
  // Frame 06's map, node 5:22966. The zone fills are the frame's own 50 % tints
  // composited onto the woodland base, and the four annotation colours are the frame's
  // values darkened until they clear WCAG AA on the fill they are painted over — the
  // frame's own values are 3.9:1 (lake name), 3.6:1 (Z09) and 4.0:1 (Z21). Every one of
  // those pairs is asserted in `__tests__/contrast.test.ts`, and the frame's original
  // values are recorded in docs/design-source.md.
  mapBase: '#E6EEDD',
  mapWoodland: '#CCDDBE',
  mapWater: '#BFDCE0',
  mapTrail: '#FAFCF5',
  mapTrailLine: '#A6B399',
  mapZoneUnpicked: '#AFCDB7',
  mapZoneRecent: '#BECAC6',
  mapZoneRipening: '#DBD5A8',
  mapZoneRecentLine: '#55648F',
  mapNote: '#4A5B5E',
  mapLakeLabel: '#35596A',
  mapZoneRecentLabel: '#44506B',
  mapZoneRipeningLabel: '#6B4A1E',
  mapScoreLowest: '#DDE5D8',
  mapScoreLowestLine: '#A9B8A2',
  mapScoreLow: '#C8DCBE',
  mapScoreLowLine: '#8FA985',
  mapScoreMid: '#A9CE9E',
  mapScoreMidLine: '#6E9562',
  mapScoreHigh: '#7CB47B',
  mapScoreHighLine: '#477C4C',
  mapScoreHighest: '#4E8F5B',
  mapScoreHighestLine: '#2C5F38',
};

/**
 * App-side derivation: the design file contains light frames only, so dark mode is
 * invented here from the same hues and must be reviewed against a real dark design.
 */
const darkColors: ThemeColors = {
  background: '#0E1418',
  surface: '#161E23',
  surfaceMuted: '#1F2A31',
  border: '#2C3A42',
  text: '#E9EFF2',
  textMuted: '#9BABB2',
  accent: '#8E97E8',
  berryDeep: '#5F69CF', // app-side: derived so the mark keeps its two-tone shape
  onAccent: '#0B1020',
  accentMuted: '#252C52',
  successMuted: '#17322A',
  warningMuted: '#332817',
  danger: '#F2B8B5',
  success: '#6FC29A',
  warning: '#E7C27D',
  // App-side, like the rest of dark mode: the design file has no dark map, so these are
  // the same relationships — darker ground, lighter annotations — inverted, and each one
  // is held to the same AA ratio by the contrast test.
  mapBase: '#26312A',
  mapWoodland: '#1F2A22',
  mapWater: '#1B2C33',
  mapTrail: '#3C4A3E',
  mapTrailLine: '#5C6B58',
  mapZoneUnpicked: '#2C443B',
  mapZoneRecent: '#2B3040',
  mapZoneRipening: '#3D3423',
  mapZoneRecentLine: '#8A96C4',
  mapNote: '#A6B7A0',
  mapLakeLabel: '#9CC3CB',
  mapZoneRecentLabel: '#B3BBE0',
  mapZoneRipeningLabel: '#E7C27D',
  mapScoreLowest: '#2E3A32',
  mapScoreLowestLine: '#4C5D50',
  mapScoreLow: '#33513C',
  mapScoreLowLine: '#547B5E',
  mapScoreMid: '#3E6B49',
  mapScoreMidLine: '#61996D',
  mapScoreHigh: '#5C9B68',
  mapScoreHighLine: '#84BE8D',
  mapScoreHighest: '#86C893',
  mapScoreHighestLine: '#B5E1BC',
};

export const themes: Record<ColorSchemeName, Theme> = {
  light: { scheme: 'light', colors: lightColors },
  dark: { scheme: 'dark', colors: darkColors },
};

/**
 * Maps a possibly-unknown system colour scheme to a supported one.
 * `light` is the explicit fallback so a missing/unknown value can never leave
 * the UI without colours.
 */
export function resolveColorScheme(scheme: string | null | undefined): ColorSchemeName {
  return scheme === 'dark' ? 'dark' : 'light';
}

/** 4pt spacing scale. Use these instead of raw numbers in styles. */
export const spacing = {
  /** Gap inside a two-line text stack (3 px, screen 03's consent and status rows). */
  tight: 3,
  xs: 4,
  /**
   * The gap inside one bar of frame 11's harvest chart — its value over the bar, and the bar
   * over its date (5 px, node `5:23386`) — the gap inside frame 16's listing block, where the
   * title, the stock line and the description sit 5 px apart (node `5:23851`), and the gap
   * between the rows of frame 14's settings group (node `5:23663`, whose five rows sit 5 px
   * apart). The design's own step rather than `xs`, which would draw a 5 px stack four pixels.
   * It was named for the chart because the chart measured it first.
   */
  chartStack: 5,
  /**
   * The design's 6 px step, first measured where it is most used: a settings row's own vertical
   * padding on screen 14 (all six of its rows), and the gap between the three lines inside frame
   * 09's timer card. One token, because it is one step (the scale holds no duplicate values).
   */
  setting: 6,
  /** Gap between a field's label and its input (7 px, screen 03). */
  label: 7,
  sm: 8,
  /** Gap between a card's rows (10 px, screen 05's benefits card). */
  cardGap: 10,
  /** The design's default gap between related items (12 px, most-used value). */
  gap: 12,
  /** Inner padding the design uses on inputs and status rows (14 px, screen 03). */
  field: 14,
  md: 16,
  /** Gap between content blocks on the design's screens (18 px, screen 01). */
  section: 18,
  /**
   * The inset frame 09's timer card draws on all four sides (20 px, node `5:23224`). Its own
   * token rather than `section`: the frames up to 08 inset their cards by 18, and this one is
   * the design's card set two pixels wider.
   */
  cardInset: 20,
  lg: 24,
  /**
   * Frame 11's harvest chart sets its three bars 28 px apart (node `5:23385`). Its own token
   * because the chart's spacing is the drawing's, not a step of the scale: the bars are laid
   * out with `justify-content: center`, so this gap is what spaces them.
   */
  chart: 28,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  /** The 2 px corner the frame gives its 8 px legend swatch. */
  xs: 2,
  sm: 4,
  md: 8,
  /** Control radius from the design's foundations (“10 px controls”). */
  control: 10,
  /** Card radius from the design's foundations (“18 px cards”). */
  lg: 18,
  pill: 999,
} as const;

export const layout = {
  /** Keeps text readable on tablets and web. */
  maxContentWidth: 640,
  /** The account's avatar on frame 14 (a 62 px circle, node `5:23627`). */
  avatarSize: 62,
  /** Action height from the design's foundations (“54 px actions”). */
  actionHeight: 54,
  /** Screen header height, measured on the design's screens (64 px). */
  headerHeight: 64,
  /** Choice chip height, measured on screen 03 (36 px). */
  chipHeight: 36,
  /**
   * The search field on frame 06 (342x50, node `5:22955`). Its own token because the design's
   * other inputs are the foundations' 54 px control: this one is the frame's 50 px field, and
   * it is a floor like the rest, so a value that grows with the system text size takes the box
   * with it (ADR-019).
   */
  searchHeight: 50,
  /**
   * The symbol tile on screen 04's frame (76 px square), which the app-drawn sign-in screen
   * carries as its key tile. Screen 04's code screen is retired (ADR-059); the metric stays
   * because the sign-in screen draws the same tile.
   */
  symbolTile: 76,
  /**
   * Smallest comfortable touch target (44 px). Screen 03's back control measures
   * exactly this; a smaller glyph grows to it with hit slop.
   */
  minTouchTarget: 44,
  /**
   * The core picker's map, measured on frame 06 (342x300, node 5:22966). Its width is the
   * content column, so only the height is a metric.
   */
  mapHeight: 300,
  /** The legend's zone swatch, measured on frame 06 (8 px, node 5:22988). */
  mapLegendSwatch: 8,
  /**
   * The core navigation bar the design draws on frames 06–14 (390x78, node `5:23012`). A
   * floor rather than a fixed box: at the largest system text size the frame's 51 px item is
   * shorter than its own icon and label, and a fixed bar would cut them off (ADR-019).
   */
  navHeight: 78,
  /**
   * One destination in that bar (90x51, the frame's four items inside its 16 px inset). Wide
   * enough on its own to be a touch target, so the item needs no hit slop.
   */
  navItemHeight: 51,
  /** The tinted pill behind the current destination's glyph (60x32, node `5:23014`). */
  navIndicatorWidth: 60,
  navIndicatorHeight: 32,
  /** The destination's glyph, measured on frame 06 (22x22). */
  navIcon: 22,
  /**
   * The season photograph on frame 07 (342x154, node 5:23046). Like `symbolTile`, the frame
   * draws no other one: a photograph shorter than the design's would crop the picture, and one
   * with no height would measure nothing, so its height stays a plain metric.
   */
  zonePhotoHeight: 154,
  /**
   * Frame 08's map (342x322, node 5:23125). Frames 06, 08 and 09 draw the *same* map at three
   * heights — 300, 322 and 210 — and the frame's own node boxes say the drawing is stretched
   * vertically rather than redrawn: every shape and label inside it scales by the same factor
   * (322/300 = 1.0733 and 210/300 = 0.7, to the tenth of a pixel). See `ZoneMap`.
   */
  routeMapHeight: 322,
  /**
   * Frame 09's map (342x210, node 5:23204) — the same drawing as frame 06's, at 0.7 of its
   * height, because the active visit is about the timer below it rather than about the map.
   */
  visitMapHeight: 210,
  /**
   * The height of one cell of frame 10's yield rating (63x72, node `5:23290`). A floor rather
   * than a fixed box: the number above its meaning has to be able to grow with the system text
   * size (ADR-019), and the row fills the content column with `flex-1` cells.
   */
  ratingCellHeight: 72,
  /**
   * The width of one bar in frame 11's harvest chart (44 px, nodes `5:23388`, `5:23392` and
   * `5:23396`). The same on all three bars, which is what makes it the drawing's metric rather
   * than a value per bar; the height is the data's (`barHeights`).
   */
  harvestBarWidth: 44,
  /**
   * The switch on frame 12's preferences card (46x28, node `5:23485`), with its 22 px thumb. The
   * design draws no other one, and this one sits on a card the screen labels as its own sample: no
   * alert is delivered and no permission is asked for, so the figure's metrics are here and its
   * behaviour deliberately is not (ADR-043).
   */
  switchWidth: 46,
  switchHeight: 28,
  switchThumb: 22,
  /**
   * The marketplace listing's card photograph (318x118, frame 15 nodes `5:23809` and `5:23819`).
   * Only the height is a metric: the width is the card's own content column.
   */
  listingPhotoHeight: 118,
  /**
   * The listing's own photograph on its detail screen (342x206, frame 16 node `5:23850`). The same
   * drawing at a larger size, so it is a second metric rather than a scale of the first.
   */
  listingDetailPhotoHeight: 206,
  /**
   * The seller's avatar on frame 16 (40x40, node `5:24530`). The frame draws its avatar as a
   * vector; the app paints the nearest glyph at the frame's own 40 px box.
   */
  sellerAvatar: 40,
  /**
   * How much of the content column a chat bubble may take (280 of 342 px, frame 17 nodes
   * `5:23910` and `5:23914`). A share rather than a width, because a bubble is set against the
   * column's edge and the column itself is what grows on a wider screen.
   */
  messageBubbleMaxWidth: '82%',
} as const;

/**
 * Type metrics measured from the design file. The design is set in Inter; this app
 * still renders the platform font until Inter is loaded (see PROJECT.md).
 */
export type TypographyVariant =
  | 'title'
  | 'headline'
  | 'heroTitle'
  | 'subtitle'
  | 'brand'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'metadata'
  | 'chip'
  | 'navLabel'
  | 'caption'
  | 'cardTitle'
  | 'cardHeading'
  | 'sectionHeading'
  | 'rowTitle'
  | 'rowValue'
  | 'stat'
  | 'statusLabel'
  | 'timer'
  | 'rating'
  | 'ratingLabel'
  | 'metric'
  | 'input'
  | 'message'
  | 'messageMeta'
  | 'cardLead'
  | 'price'
  | 'priceLarge'
  | 'priceTotal'
  | 'listingHeading'
  | 'mapLabel'
  | 'mapAnnotation'
  | 'code'
  | 'profileName'
  | 'profileInitials';

export const typography = {
  /** Onboarding headline metrics (“Find. Pick. Share. Sustain.”, 30/42). */
  headline: { fontSize: 30, lineHeight: 42, fontWeight: '400' },
  /** Hero title metrics (28/39). */
  title: { fontSize: 28, lineHeight: 39, fontWeight: '400' },
  /**
   * A card's own headline, where the frame sets it larger than a section heading (frame 12's alert
   * “Ripe bilberries 1.8 km north”, 24/33.6 regular, node `5:23456`). Its own slot rather than
   * `rating`: that one is a choice's number under a question, and this one is a sentence.
   */
  heroTitle: { fontSize: 24, lineHeight: 34, fontWeight: '400' },
  /** Screen title metrics (20/28). */
  subtitle: { fontSize: 20, lineHeight: 28, fontWeight: '400' },
  /** Wordmark metrics: the design sets “picky” in Inter 42/700. */
  brand: { fontSize: 42, lineHeight: 51, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  /** Supporting copy metrics (14 px at the design's 140 % line height). */
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  /** A card row's title metrics (15/21, semibold, measured on screen 05). */
  cardTitle: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  /** A card's own heading metrics (19/27, measured on frame 06's zone card). */
  cardHeading: { fontSize: 19, lineHeight: 27, fontWeight: '400' },
  /**
   * A section heading inside a screen (18/25, measured on frame 07's “Today's outlook”).
   * The frame sets “Fresh from pickers” one pixel smaller (17/23.8); the app keeps one slot
   * for the two of them, which is the smallest departure that leaves a section heading
   * looking like a section heading.
   */
  sectionHeading: { fontSize: 18, lineHeight: 25, fontWeight: '400' },
  /**
   * The title of a row inside a card, where the frame sets it heavier than a section heading
   * (17/23.8 semibold, frame 08's “Follow the forest trail”). It is a slot of its own rather
   * than `cardTitle`: that one is the design's 15/21 for a settings row, and the weight — not
   * the size — is what tells a reader this row is the instruction to follow.
   */
  rowTitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  /**
   * A card's own large value, over its label (frame 08's “1.4 km” and “22 min”, node 5:23147,
   * measured at 27/37.8 regular). Like `metric`, its colour is the caller's.
   */
  stat: { fontSize: 27, lineHeight: 38, fontWeight: '400' },
  /**
   * The label above a card's large value (frame 09's “ACTIVE · LINGONBERRY”, 12/16.8 semibold,
   * node `5:23225`). Its own slot rather than `chip`: that one is the design's 10/14 all-caps
   * tag, and this one is set at the body copy's own 140 % line height.
   */
  statusLabel: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  /**
   * The largest live reading in the app (frame 09's elapsed time “00:42:17”, 52/62.9 semibold,
   * node `5:23226`). Two points above `metric`, and semibold where the score is regular: this
   * one is the screen's clock, and the design sets it the way a clock is set.
   */
  timer: { fontSize: 52, lineHeight: 63, fontWeight: '600' },
  /**
   * One cell's number in frame 10's yield rating (24/29, node `5:23291`). Its own slot rather
   * than `digit` (25/30 semibold): the rating is regular weight, because it is a choice rather
   * than a reading.
   */
  rating: { fontSize: 24, lineHeight: 29, fontWeight: '400' },
  /**
   * The word under that number (11/13.3 medium: “None”, “Few”, “Fair”, “Good”, “Lots”, node
   * `5:23292`) — the smallest type in the app, and the reason a rating cell is readable at all.
   */
  ratingLabel: { fontSize: 11, lineHeight: 13, fontWeight: '500' },
  /**
   * A hero number, measured on frame 07's yield card (the design's “78” at 50/60.5, regular).
   * It carries the screen's own weight: the caller sets it, as it does for the map's labels.
   */
  metric: { fontSize: 50, lineHeight: 61, fontWeight: '400' },
  /** An input's own text metrics (15/21, measured on frame 06's search field). */
  input: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  /**
   * A chat message inside its bubble (15/21, frame 17 node `5:23911`) and the line an order
   * lists its weight against its unit on (frame 18 node `5:23964`). Its own slot rather than
   * `input`: that one is the metrics of a field's value, and neither of these is a field.
   */
  message: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  /**
   * The clock and the receipt under a chat bubble (11/13.3, frame 17 node `5:23912`) — the
   * smallest type on the marketplace screens, and the reason a bubble's provenance is readable.
   */
  messageMeta: { fontSize: 11, lineHeight: 13, fontWeight: '400' },
  /**
   * The tall lead line of a marketplace card — the seller's name, the listing under a chat's
   * header, the pickup row (16/22.4 semibold, frame 16 node `5:23870`). Its own slot rather than
   * `cardTitle`: that one is the design's 15/21 settings-row title, and this one is a heading.
   */
  cardLead: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  /**
   * A listing's price on frame 15's card (18/21.78 regular, node `5:23812`). Its colour is the
   * caller's, as `metric`'s is.
   */
  price: { fontSize: 18, lineHeight: 22, fontWeight: '400' },
  /**
   * The price per kilogram on the listing's own screen (23/27.8 regular, frame 16 node
   * `5:23854`), which sets it larger than a card can: it is the figure the screen is about.
   */
  priceLarge: { fontSize: 23, lineHeight: 28, fontWeight: '400' },
  /**
   * The marketplace's largest figure — what an order holds (26/31.5 regular, frame 18 node
   * `5:23972`). Its own slot rather than `priceLarge`: the design sets the total two points
   * larger again, and a total that looked like a line item would be the wrong reading.
   */
  priceTotal: { fontSize: 26, lineHeight: 31, fontWeight: '400' },
  /**
   * The listing's own headline above its description (26/36.4 regular, frame 16 node `5:23853`).
   * Its own slot rather than `heroTitle`: that one is frame 12's alert heading over 33.6, and a
   * listing's headline is a sentence set at a sentence's own leading.
   */
  listingHeading: { fontSize: 26, lineHeight: 36, fontWeight: '400' },
  /**
   * A label painted on the map (12/15, measured on frame 06's place name and zone
   * identifiers). Its weight is the caller's: the frame draws the place name at 500 and a
   * zone identifier at 600.
   */
  mapLabel: { fontSize: 12, lineHeight: 15, fontWeight: '500' },
  /**
   * The map's smallest annotations (10/12): the lake's name, the scale line and the legend
   * labels. The frame sets the lake's name one pixel smaller (9/11); the app keeps one
   * token for the three of them, which is the smallest departure that keeps them legible.
   */
  mapAnnotation: { fontSize: 10, lineHeight: 12, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 16, fontWeight: '600' },
  /**
   * The value at the end of a settings row, where the frame sets it semibold in the accent colour
   * (frame 14's “1 queued”, 14/17, node `5:23673`). Its own slot rather than `caption`: that one is
   * 13/18 body copy, and this one is a reading the row is about.
   */
  rowValue: { fontSize: 14, lineHeight: 17, fontWeight: '600' },
  metadata: { fontSize: 12, lineHeight: 17, fontWeight: '400' },
  /** Chip and eyebrow metrics (“ONBOARDING · 01 / 05”, 10/14 semibold). */
  chip: { fontSize: 10, lineHeight: 14, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  /**
   * A destination's label in the core navigation (12/15, frames 06–14). Its own slot rather
   * than `metadata`: that one is 12/17, and the frame's bar is measured against 15. The
   * current destination's weight is 600, which the component sets — the weight differs per
   * item while the size does not.
   */
  navLabel: { fontSize: 12, lineHeight: 15, fontWeight: '400' },
  code: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    }),
  },
  /**
   * The account's own name on frame 14's profile row (“Aino Korhonen”, 21/29.4 regular, node
   * `5:23630`). Its own slot rather than `subtitle`: that one is a screen's title at 20/28, and
   * this is the name of the person the screen is about.
   */
  profileName: { fontSize: 21, lineHeight: 29, fontWeight: '400' },
  /**
   * The monogram inside that row's avatar (frame 14's “AK”, 23/27.8 regular, node `5:23628`).
   * Its own slot rather than `priceLarge`, which happens to be 23/28: a price and a monogram are
   * not the same reading, and a slot named after one must not be borrowed for the other.
   */
  profileInitials: { fontSize: 23, lineHeight: 28, fontWeight: '400' },
} as const satisfies Record<TypographyVariant, TextStyle>;
