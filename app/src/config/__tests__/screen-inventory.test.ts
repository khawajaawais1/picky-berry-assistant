/// <reference types="node" />
// Node's file APIs, for reading the inventory and walking the routes. `tsconfig.json` restricts the
// automatic type set to `jest`, so this file asks for the other one it needs by name.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * “Is every screen the design draws built, and is anything built that nobody inventoried?”
 *
 * That question was asked of this repository twice on 2026-10-11 (“do the remaining screens”), and
 * answering it by reading the code is exactly the kind of review that goes stale: the design file
 * holds nineteen top-level frames, the app has eighteen screens plus the ones the design never drew,
 * and the only place that says which is which is `docs/design-source.md`. Nothing failed when the
 * two drifted — a screen whose row was never written is invisible, and a row pointing at a route
 * that was renamed reads as built.
 *
 * So the inventory is asserted, in three directions:
 *
 * 1. **Every frame in the file has a status row.** The frame list (“What the file contains”) and the
 *    status table (“Screen status”) have to name the same frames, so a frame nobody decided about
 *    cannot hide in the first table while the second one looks complete.
 * 2. **Every route the status table names exists.** A renamed or deleted route file leaves a row
 *    claiming a screen is built.
 * 3. **Every route the app has is named by the inventory**, either as the file the status table
 *    renders through or as a route path in the app-drawn sections — a new page file is a screen, and
 *    a screen with no inventory row is the case this file exists for. `_layout.tsx` (a navigator, not
 *    a screen) and `+not-found.tsx` (Expo's fallback) are the two exclusions, named here.
 *
 * What it does **not** decide: whether a frame *should* be built, whether a screen's “partial” note is
 * still accurate, or whether what it draws is honest. Those are review questions, and the second one
 * is what PROJECT.md's known issues exist for.
 *
 * It lives in `src/config/__tests__` for the reason `verify-gate.test.ts`, `adr-integrity.test.ts` and
 * `questionnaire-reconciliation.test.ts` do: it guards the project's documents rather than a module's
 * behaviour, and `npm run verify` runs it in the gate.
 */

/** The repository root: this file is `src/config/__tests__/`. */
const ROOT = join(__dirname, '..', '..', '..');

/** The document that says what the design contains and what is built from it. */
const INVENTORY = 'docs/design-source.md';

/**
 * The two files under `src/app/` that are not screens: a navigator mounts its children, and the
 * `+not-found` route is Expo Router's own fallback rather than a frame's screen.
 */
const NOT_SCREENS = new Set(['_layout.tsx', '+not-found.tsx']);

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

/** The body of one `##`/`###` section, up to the next heading of the same or a higher level. */
function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading);

  if (start === -1) {
    throw new Error(`no section “${heading}” in ${INVENTORY}: this file's reading of it is wrong`);
  }

  const rest = markdown.slice(start + heading.length);
  const end = rest.search(/\n#{2,3} /);

  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * A table's rows as cells. Splitting on the pipes rather than matching a pattern that assumes the
 * columns' padding: the tables are hand-aligned, so the spaces after a number are not stable.
 */
function rowsIn(body: string): string[][] {
  return (
    body
      .split('\n')
      .filter((line) => line.trimStart().startsWith('|'))
      .map((line) => line.split('|').map((cell) => cell.trim()))
      // The first and last elements are the empty strings outside the table's outer pipes.
      .map((cells) => cells.slice(1, -1))
      .filter((cells) => cells.length > 1)
  );
}

/** The rows of a table whose first column is a frame number, as `[frame, ..., cells]`. */
function frameRows(body: string): { frame: string; cells: string[] }[] {
  return rowsIn(body)
    .filter((cells) => /^\d\d$/.test(cells[0] ?? ''))
    .map(([frame, ...rest]) => ({ cells: rest, frame: frame! }));
}

/** Every route file the app has, as root-relative paths. */
function pageFiles(): string[] {
  const app = join(ROOT, 'src', 'app');

  const walk = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return walk(path);
      }

      return entry.isFile() && entry.name.endsWith('.tsx') && !NOT_SCREENS.has(entry.name)
        ? [path.slice(ROOT.length + 1)]
        : [];
    });

  return walk(app);
}

/** The route Expo Router serves a page file at: `src/app/(app)/your-data.tsx` → `/your-data`. */
function routeOf(file: string): string {
  const route = file
    .replace(/^src\/app/, '')
    .replace(/\.tsx$/, '')
    // A route group — `(app)` — organises files without appearing in the path.
    .split('/')
    .filter((segment) => segment !== '' && !segment.startsWith('('))
    .join('/');

  return route === '' || route === 'index' ? '/' : `/${route}`;
}

describe('the screen inventory', () => {
  const markdown = read(INVENTORY);

  it('decides about every frame the design file contains', () => {
    const inFile = frameRows(section(markdown, '## What the file contains')).map(
      ({ frame }) => frame,
    );
    const decided = frameRows(section(markdown, '## Screen status')).map(({ frame }) => frame);

    // Both directions, named rather than counted, so a failure says which frame is undecided.
    expect(inFile.filter((frame) => !decided.includes(frame))).toEqual([]);
    expect(decided.filter((frame) => !inFile.includes(frame))).toEqual([]);
    // Nineteen top-level frames: screens 01–18 plus the foundations frame, which is not a screen
    // and therefore has no status row either way.
    expect(inFile.length).toBe(18);
  });

  it('names a route that exists for every frame except the one out of scope and the one retired', () => {
    const rows = frameRows(section(markdown, '## Screen status'));
    const routeOf = (cells: string[]) =>
      /`(src\/app\/[^`]+\.tsx)`/.exec(cells.join('|'))?.[1] ?? null;

    // Frame 02 is design exploration only (PROJECT.md assumption 1), and frame 04 is retired: its
    // credential is screen 03's email + password, so the code screen has no route (ADR-059). Any
    // third row without one is a frame whose screen either does not exist or was forgotten, which
    // is the case this test exists for.
    expect(rows.filter(({ cells }) => routeOf(cells) === null).map(({ frame }) => frame)).toEqual([
      '02',
      '04',
    ]);

    const missing = rows.flatMap(({ cells, frame }) => {
      const path = routeOf(cells);

      if (path === null) {
        return [];
      }

      try {
        read(path);
        return [];
      } catch {
        return [`frame ${frame} names ${path}, which is not on disk`];
      }
    });

    expect(missing).toEqual([]);
  });

  it('inventories every route the app has', () => {
    const uninventoried = pageFiles()
      .filter((file) => !markdown.includes(file) && !markdown.includes(`\`${routeOf(file)}\``))
      .map((file) => `${file} (${routeOf(file)}) is a screen with no row in ${INVENTORY}`);

    expect(uninventoried).toEqual([]);
  });

  it('reads the app’s own routes rather than a hand-kept list', () => {
    // The scan's reach, asserted: a wrong root would read as “no routes”, which passes while
    // checking nothing.
    const found = pageFiles();

    expect(found).toContain('src/app/index.tsx');
    expect(found).toContain('src/app/(app)/downloads.tsx');
    expect(found.filter((file) => file.endsWith('_layout.tsx'))).toEqual([]);
  });
});
