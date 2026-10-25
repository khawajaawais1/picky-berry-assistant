/// <reference types="node" />
// Node's file APIs, for walking the shared component layers. `tsconfig.json` restricts the
// automatic type set to `jest`, so this file asks for the other one it needs by name.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

/**
 * “Does the shared UI still point one way?”
 *
 * Atomic Design is the repository's stated UI rule (`AGENTS.md`, ARCHITECTURE §3.2): an atom is
 * composed into a molecule, a molecule into an organism, an organism into a template, and a
 * template into a screen. The rule is easy to state and easy to break in a way nothing notices —
 * an `atom` importing a `molecule` still renders, and a shared component importing a feature's
 * internals still compiles. By the time a reader finds it, the direction is folklore.
 *
 * So this asserts the two directions the layers depend on:
 *
 * - **A shared layer may import its own layer or a lower one, never a higher one.** `atoms/` is
 *   the bottom; `templates/` may use all three below it. Same-layer composition is allowed: a
 *   `ChoiceChips` molecule is built from `Chip` molecules, which is still one reusable unit.
 * - **Shared code never imports a feature.** The feature graph reaches shared code, not the
 *   other way round (ARCHITECTURE §3.1); a shared component that knows `@/features/**` is a
 *   screen pretending to be a primitive.
 *
 * What it does not police: whether a component belongs in the layer it is in. That is a review
 * question — this file only keeps the layers from pointing uphill.
 *
 * It lives in `src/config/__tests__/` with the other repository-document guards, so
 * `npm run verify` runs it.
 */

/** The repository root: this file is `src/config/__tests__/`. */
const ROOT = join(__dirname, '..', '..', '..');

/** The shared component tree and the layers this test knows how to order. */
const COMPONENTS = join(ROOT, 'src', 'components');
const LAYERS = ['atoms', 'molecules', 'organisms', 'templates'] as const;
type Layer = (typeof LAYERS)[number];

/** The direction a layer may import: itself and everything below it. */
function rank(layer: Layer): number {
  return LAYERS.indexOf(layer);
}

function isLayer(value: string | undefined): value is Layer {
  return value !== undefined && (LAYERS as readonly string[]).includes(value);
}

/** Every `.ts`/`.tsx` file under the shared component tree, tests included. */
function componentFiles(): string[] {
  const walk = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) return walk(path);

      return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : [];
    });

  return walk(COMPONENTS);
}

/** The specifier of every `import … from '…'` in a source file. */
function importSpecifiers(source: string): string[] {
  // Every import in this repository ends with a semicolon, so `[^;]` is a safe statement
  // boundary even when the bindings span lines. Side-effect imports (`import 'x';`) have no
  // `from` and are not module-layer dependencies worth ordering.
  return [...source.matchAll(/import\s+(?:type\s+)?[^;]*?from\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1]!,
  );
}

/** The component layer a specifier points at, or `null` for shared code outside the layers. */
function importedLayer(specifier: string, file: string): Layer | null {
  if (specifier.startsWith('@/components/')) {
    const [layer] = specifier.slice('@/components/'.length).split('/');
    return isLayer(layer) ? layer : null;
  }

  if (!specifier.startsWith('.')) return null;

  const path = relative(COMPONENTS, resolve(dirname(file), specifier));
  const [layer] = path.split(sep);

  return isLayer(layer) ? layer : null;
}

/** Whether a specifier leaves the shared tree for a feature's internals. */
function importsFeature(specifier: string, file: string): boolean {
  if (specifier === '@/features' || specifier.startsWith('@/features/')) return true;
  if (!specifier.startsWith('.')) return false;

  const path = relative(join(ROOT, 'src'), resolve(dirname(file), specifier));

  return path === 'features' || path.startsWith(`features${sep}`);
}

describe('the shared component layers', () => {
  const files = componentFiles();

  it('never imports a feature from shared code', () => {
    const offences = files.flatMap((file) =>
      importSpecifiers(readFileSync(file, 'utf8'))
        .filter((specifier) => importsFeature(specifier, file))
        .map(
          (specifier) =>
            `${relative(ROOT, file)} imports “${specifier}” — shared code must not reach into a feature`,
        ),
    );

    expect(offences).toEqual([]);
  });

  it('only imports itself or a lower layer (atoms → molecules → organisms → templates)', () => {
    const offences: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const [ownLayer] = relative(COMPONENTS, file).split(sep);

      if (!isLayer(ownLayer)) continue;

      for (const specifier of importSpecifiers(source)) {
        const layer = importedLayer(specifier, file);

        if (layer === null) continue;
        if (rank(layer) <= rank(ownLayer)) continue;

        offences.push(
          `${relative(ROOT, file)} (${ownLayer}) imports “${specifier}” (${layer}) — a layer may only import itself or a lower one`,
        );
      }
    }

    expect(offences).toEqual([]);
  });
});
