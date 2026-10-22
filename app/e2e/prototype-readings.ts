import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { appPages, routesRendering } from './app-pages';

/**
 * The review-only prototype surfaces, as the two harnesses meet them.
 *
 * **Why they need reading at all.** The prototypes are throwaway paper for design questions the
 * design file has no frame for (the sign-in screen, the community map). They are hard-coded English
 * by design — a prototype's wording is not a translation anyone should review — so the copy scan
 * skips them; they are mounted only in a development build, so a shipped screen is not what they
 * become; and the layout harness's manifest is built from catalogue keys, so they were measured by
 * nothing. A designer judging them by flipping between readings is therefore looking at a surface
 * whose copy can be clipped, whose controls can be unnamed, and whose bar can be broken without a
 * single check going red.
 *
 * **Where the list comes from.** Not from here: each prototype's own variant table is the one place
 * its readings are declared (`SIGN_IN_VARIANTS`, `COMMUNITY_MAP_VARIANTS`), and the route a reading
 * is drawn on is read from `src/app` — the route that renders the prototype when its table names no
 * path of its own, the table's own path when it does (the community map's three readings disagree
 * about *where* they live). A variant added to a table, or a reading moved to another screen,
 * therefore reaches both harnesses without anyone remembering to update a list here — and a reading
 * with no copy declared is a failure rather than a silent skip (`undescribedReadings`).
 *
 * What this file cannot do: **import** the tables. They live in React Native modules, so reading
 * them as text is the only option — which is why the extraction is narrow (a `key`, a `name`, an
 * optional `path` per entry) and the reach cases assert what came back rather than trusting it.
 */

type PrototypeSource = {
  /** What a reviewer calls it. */
  name: string;
  /** The file whose variant table declares its readings. */
  file: string;
  /** The table's declaration name, so a renamed table fails loudly rather than silently. */
  table: string;
  /** The component a route renders, for finding the route when the table names no path. */
  component: string;
};

const PROTOTYPES: readonly PrototypeSource[] = [
  {
    name: 'sign-in',
    file: 'src/features/onboarding/components/prototype/sign-in-variants.tsx',
    table: 'SIGN_IN_VARIANTS',
    component: 'SignInPrototype',
  },
  {
    name: 'community-map',
    file: 'src/features/discover/components/prototype/community-map-variants.tsx',
    table: 'COMMUNITY_MAP_VARIANTS',
    component: 'CommunityMapPrototype',
  },
];

/** One reading, as the prototype's own table declares it. */
type DeclaredReading = {
  prototype: string;
  key: string;
  name: string;
  /** The route it is drawn on. */
  path: string;
};

/** One entry of a variant table: `{ key: 'A', name: 'Code first' }`, with a path when it has one. */
const ENTRY = /\{\s*key:\s*'([^']+)',\s*name:\s*'([^']+)'(?:,\s*path:\s*'([^']+)')?\s*\}/g;

/**
 * The readings each prototype's variant table declares.
 *
 * The table is read as text from `export const <TABLE> … ];` — the first `];` after the
 * declaration closes it, and every entry in between is one reading. A path in the table wins; with
 * none, the reading is drawn on the route that renders the prototype, which is read from `src/app`
 * so a prototype that moves follows.
 */
function declaredReadings(source: PrototypeSource): DeclaredReading[] {
  const text = readFileSync(join(__dirname, '..', source.file), 'utf8');
  const mountedOn = routesRendering(source.component);
  const declaration = text.indexOf(`export const ${source.table}`);
  const end = declaration === -1 ? -1 : text.indexOf('];', declaration);

  if (declaration === -1 || end === -1) {
    throw new Error(
      `${source.file} no longer declares ${source.table} — the harness reads that table to know what to check`,
    );
  }

  const table = text.slice(declaration, end);
  const entries = [...table.matchAll(ENTRY)];

  if (entries.length === 0) {
    throw new Error(
      `${source.file}: ${source.table} declares no reading this harness can read — check the entry shape it expects (key, name, optional path)`,
    );
  }

  return entries.map(([, key, name, path]) => {
    if (path === undefined && mountedOn.length !== 1) {
      throw new Error(
        `${source.file}: ${source.table}'s “${key ?? ''}” names no path, but ${source.component} is mounted on ${mountedOn.length} routes (${mountedOn.join(', ')}) — a reading that does not say which screen it belongs to cannot be measured on one`,
      );
    }

    return {
      key: key ?? '',
      name: name ?? '',
      path: path ?? mountedOn[0]!,
      prototype: source.name,
    };
  });
}

/**
 * The prototype's own copy — **literal by design, so declared here rather than read from a
 * catalogue.** Every string is verbatim from the prototype's source (a typo is caught by the
 * measurement failing, which is the point: the harness says what it expects the designer to see).
 *
 * Two kinds of string are here on purpose: the sentences a reading is judged on, where a clip at
 * 200 % would be the defect, and the actions and headings that prove the *right* reading mounted —
 * a harness that measured a string the app's own screen also renders would pass while the prototype
 * was never drawn. The switcher's own line is derived instead (`PROTOTYPE · A · Code first`), so a
 * renamed reading cannot leave a stale expectation behind.
 *
 * Only **rendered text** counts: an `accessibilityLabel`, a placeholder or a `values`-driven
 * sentence is not a text node, so declaring one reports a reading that renders perfectly as broken
 * (found the first time this list was run). What the reader is *told* rather than shown is the
 * accessibility walk's business, not this list's.
 */
const COPY: Record<string, readonly string[]> = {
  'sign-in:A': [
    'Sign in with a code.',
    'We send six digits to your email or phone. No password to remember — and none to leak.',
    'Continues to screen 04’s six-cell code field, which is already built and measured.',
    'I don’t have an account yet',
  ],
  // Visible text only: the chips' group label (“How you signed up”) and the field placeholders are
  // not text nodes, so measuring them would report a reading that renders perfectly as broken.
  'sign-in:B': ['Forgot password?', 'Create an account', 'Sign in', 'Password'],
  'sign-in:C': [
    'Continue with biometrics',
    'Fingerprint, Face ID or whatever this phone already uses — the OS does the asking, and the app is never told which one it was.',
    'Use my password instead',
    'Last used on this phone',
  ],
  'community-map:A': [
    'Shared with you',
    'Shared spot — a place someone picked and shared with you (3 now)',
    'Left out on purpose: frame 14’s “Public” state, an invite list, and any way to remove a spot someone else shared.',
  ],
  'community-map:B': [
    'Shared here',
    'Places other pickers shared with you in this zone. Their own position is not on this screen and never was: a shared spot is a place.',
    'Big lingonberry patch on the north side — the bog is dry this year.',
    'Not drawn: the empty state (nobody has shared a place here yet), a spot whose sharer removed it, and any action — the rows are readings, and no screen opens a shared place.',
  ],
  'community-map:C': [
    'Shared with you',
    'This reading files shared places in the picker’s own plan — the screen frame 14’s “Saved spots” row opens, whose title is the one above — as one card per place, with the person who shared it on the card.',
    'Your own plan',
    'Left out on purpose: whether a shared place belongs on this screen at all, the frame’s “Public” state, and any way to un-share or to leave the list.',
  ],
};

/** One prototype reading, ready for a browser. */
export type PrototypeReading = {
  prototype: string;
  key: string;
  name: string;
  /** The route the reading borrows. */
  path: string;
  /** The URL a reviewer opens: the route the reading borrows, with its own `?variant=`. */
  url: string;
  /** The switcher's own line, derived from the table so a renamed reading cannot drift. */
  bar: string;
  /** Copy that must render: the prototype's own words, verbatim. */
  copy: readonly string[];
};

/** The readings, in the prototype tables' own order. A reading with no copy gets an empty list. */
export const PROTOTYPE_READINGS: readonly PrototypeReading[] = PROTOTYPES.flatMap((source) =>
  declaredReadings(source).map((reading) => ({
    ...reading,
    bar: `PROTOTYPE · ${reading.key} · ${reading.name}`,
    copy: COPY[`${reading.prototype}:${reading.key}`] ?? [],
    url: `${reading.path}?variant=${reading.key}`,
  })),
);

/**
 * The readings the tables declare, with nothing declared to measure — the harness's own blind
 * spot, named. A variant added to a prototype reaches both harnesses through the table, and this
 * is what makes that arrival a failure rather than a screen nothing checks.
 */
export function undescribedReadings(): string[] {
  return PROTOTYPE_READINGS.filter((reading) => reading.copy.length === 0).map(
    (reading) => `${reading.prototype}:${reading.key} (${reading.url})`,
  );
}

/**
 * Readings whose route is not a route the app has, or is not one of the routes that render their
 * prototype — a table pointing at a screen that was renamed, deleted, or that draws something else
 * entirely. Without this a stale path measures whatever the router does with an unknown URL, which
 * is how a harness ends up green about a surface nobody can open.
 */
export function readingsOffTheirPrototype(): string[] {
  const routes = new Set(appPages().map((page) => page.route));
  const problems: string[] = [];

  for (const source of PROTOTYPES) {
    const mountedOn = routesRendering(source.component);

    for (const reading of PROTOTYPE_READINGS.filter(
      (candidate) => candidate.prototype === source.name,
    )) {
      if (!routes.has(reading.path) || !mountedOn.includes(reading.path)) {
        problems.push(
          `${reading.prototype}:${reading.key} → ${reading.url} (${source.component} renders on ${mountedOn.join(', ')})`,
        );
      }
    }
  }

  return problems;
}
