import type { ThemeColors } from '@/constants/theme';

import type { Species } from './species';
import { MAP_ZONE_SHAPES } from './zone-map-geometry';

/**
 * A zone is an area of forest a picker reports on. This module holds the two things the
 * Discover screen needs from one: the vocabulary the legend uses for its state, and what
 * each state looks like.
 *
 * There is no zone source yet — no service returns zones, no place holds a report — so the
 * app cannot show *this user's* zones. It shows the design's own composition instead, and
 * says so: the frame's eyebrow reads “SEASON DEMO” and its map is the one the composition
 * draws. That is what `DEMO_ZONES` is, and it is deliberately the only place in the app
 * where zone data is invented; when a source exists it replaces this constant and nothing
 * else on the screen changes.
 */

/**
 * The three states the frame's legend names, in the order it names them. The wording is
 * the catalogue's (`discover.legend.*`), never these identifiers.
 */
export const ZONE_STATES = ['unpicked', 'recentlyPicked', 'ripening'] as const;

export type ZoneState = (typeof ZONE_STATES)[number];

/**
 * One zone as the frame draws it. `id` is the map's own label for it (“Z14”) and `number`
 * is how the frame's card spells the same zone (“Zone 14”); both are the design's words,
 * not a formatting rule this app applies to an identifier.
 *
 * `score` is the reported yield, which the frame draws for one zone only: a zone nobody has
 * reported on has no score, and the frame's map shows exactly that.
 *
 * `species` is what pickers reported in it and `place` is what it is called on the ground.
 * Both are the frame's own nouns rather than copy: “Laajavuori” reads the same in Finnish and
 * English, and the species' *words* are the catalogue's (`species-copy.ts`) — which is why the
 * chip that filters by species holds an identifier and never a translation.
 */
export type DemoZone = {
  id: string;
  number: string;
  state: ZoneState;
  score?: number;
  species: readonly Species[];
  place?: string;
};

/**
 * The frame's own three zones, as its map, its legend and its card draw them.
 *
 * Two things here are the demo's rather than the frame's, and both are recorded in
 * docs/design-source.md: the frame names a species for zone 14 alone (its card reads “Zone 14
 * · Lingonberry”), so the other two are given the species their chips would search for —
 * otherwise two of the frame's three chips would filter nothing — and only zone 14 has a place
 * name, because it is the only one the frame puts on the ground.
 *
 * `zone-places.test.ts` ties zone 14's place to the label the map paints, so the frame's own
 * words and the searchable value cannot drift apart.
 */
export const DEMO_ZONES: readonly DemoZone[] = [
  // The zone the frame's card is about: unpicked, ripe, reported 38 minutes ago, and the one
  // frame 07 opens — where the frame names two berries, so the zone is reported for both
  // (`discover.card.title` names the first, which is why the card still reads “Lingonberry”).
  {
    id: 'Z14',
    number: '14',
    state: 'unpicked',
    score: 78,
    species: ['lingonberry', 'bilberry'],
    place: 'Laajavuori',
  },
  { id: 'Z09', number: '09', state: 'recentlyPicked', species: ['bilberry'] },
  { id: 'Z21', number: '21', state: 'ripening', species: ['cloudberry'] },
];

/** How a state is drawn: the polygon the frame gives it and the tokens it is painted in. */
export type ZoneAppearance = {
  /** The polygon the frame draws for this state, in the map's own coordinates. */
  shape: string;
  fill: keyof ThemeColors;
  /**
   * The 2 px outline, and — in the legend — the swatch that names the state. The two are
   * the same colour in the frame, which is what makes the legend readable.
   */
  line: keyof ThemeColors;
  /** The colour the frame paints this state's own zone label in. */
  label: keyof ThemeColors;
};

/**
 * The frame's own state-to-colour rules, measured on its map (node 5:22966) and its legend
 * (5:22986). They live together so the map and the legend cannot drift: a state renamed or
 * recoloured in one place would otherwise leave the other naming a colour that no longer
 * exists on the map.
 */
export const ZONE_APPEARANCE: Record<ZoneState, ZoneAppearance> = {
  unpicked: {
    shape: MAP_ZONE_SHAPES.unpicked,
    fill: 'mapZoneUnpicked',
    line: 'success',
    label: 'success',
  },
  recentlyPicked: {
    shape: MAP_ZONE_SHAPES.recentlyPicked,
    fill: 'mapZoneRecent',
    line: 'mapZoneRecentLine',
    label: 'mapZoneRecentLabel',
  },
  ripening: {
    shape: MAP_ZONE_SHAPES.ripening,
    fill: 'mapZoneRipening',
    line: 'warning',
    label: 'mapZoneRipeningLabel',
  },
};

/** The zone the frame's card is about: the unpicked one it draws a score badge on. */
export const CARD_ZONE_STATE: ZoneState = 'unpicked';
