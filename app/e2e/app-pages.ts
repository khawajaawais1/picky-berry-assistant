import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The page files the app has, and the route each one serves — the one reading of `src/app` the
 * browser harnesses share.
 *
 * It lives apart from both of them for the reason it exists at all: two harnesses now need to know
 * what the app's screens are, and two hand-kept lists would drift. The accessibility walk asks for
 * **every route** (so a screen added tomorrow is walked tomorrow), and the prototype readings ask
 * **which route renders a named prototype** (so a reading that moves to another screen cannot
 * leave the harness measuring the old one). Both are the same traversal with a different question
 * asked of it.
 *
 * `_layout.tsx` is a navigator, not a screen. A route group — `(app)` — organises files without
 * appearing in the path. `index.tsx` is the root.
 */
export type AppPage = {
  /** The file, relative to `src/app`. */
  file: string;
  /** The route it serves, as a browser asks for it. */
  route: string;
};

const APP = join(__dirname, '..', 'src', 'app');

export function appPages(): AppPage[] {
  const walk = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return walk(path);
      }

      return entry.isFile() && entry.name.endsWith('.tsx') && entry.name !== '_layout.tsx'
        ? [path.slice(APP.length + 1)]
        : [];
    });

  return (
    walk(APP)
      .map((file) => ({
        file,
        route: file
          .replace(/\.tsx$/, '')
          .split('/')
          .filter((segment) => segment !== '' && !segment.startsWith('('))
          .join('/'),
      }))
      // `index.tsx` is the root of whatever it sits in, and the root of the app when it sits at the
      // top: Expo Router's own rule, kept here because a route is what a browser asks for.
      .map((page) => ({
        ...page,
        route: page.route === '' || page.route === 'index' ? '/' : `/${page.route}`,
      }))
      .sort((left, right) => (left.route < right.route ? -1 : 1))
  );
}

/**
 * The routes of the pages that render `component` — `<SignInPrototype` finds the screen that mounts
 * it. Read from the source rather than declared, so a prototype that moves to another screen is
 * followed instead of measured where it used to be. More than one is normal and meaningful: the
 * community map's three readings borrow three routes.
 *
 * Throws when nothing renders it: a prototype the app has stopped mounting is a harness bug that
 * must be loud, not an empty list that reads as “nothing to check”.
 */
export function routesRendering(component: string): string[] {
  const needle = `<${component}`;
  const routes = appPages()
    .filter((page) => readFileSync(join(APP, page.file), 'utf8').includes(needle))
    .map((page) => page.route);

  if (routes.length === 0) {
    throw new Error(
      `No page under src/app renders ${needle} — a prototype nothing mounts is nothing to check, which must not read as a pass`,
    );
  }

  return routes;
}
