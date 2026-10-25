/// <reference types="node" />
// Node's file APIs, for reading the two artefacts below. `tsconfig.json` restricts the
// automatic type set to `jest`, so this file asks for the other one it needs by name.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The gate a contributor runs before a commit (`npm run verify`, CONTRIBUTING.md) and the gate
 * CI runs before a merge — held to the same set of checks, with the formatting check among them.
 *
 * The defect this exists for shipped once: `verify` ran the typecheck, the lint and the tests
 * but not `format:check`. A contributor could therefore run the command the repository tells them
 * to run before every commit, see it pass, and commit files Prettier would rewrite — the commit
 * claimed to be verified while the tree was not clean. The formatting check was enforced by a CI
 * step *beside* the gate rather than inside it, which is the difference the gate is supposed to
 * make invisible.
 *
 * Both artefacts are configuration, so this test reads them rather than importing them: the
 * `scripts` block of `package.json`, and the steps of the CI job that guards a merge. A check
 * added to one and forgotten in the other is what it fails on, in either direction.
 *
 * It lives in `src/config/__tests__` because the configuration it guards is the project's rather
 * than any module's — there is no feature, component or service whose `__tests__` folder would
 * own it (ARCHITECTURE.md's `src/config/` row is the closest home, and `npm run verify` itself
 * runs this file, so the guard cannot be skipped without failing the gate it describes).
 */
const GATE = ['format:check', 'typecheck', 'lint', 'test'] as const;

/** The app's root (the npm package): this file is `src/config/__tests__/`. */
const ROOT = join(__dirname, '..', '..', '..');

/**
 * The workflow lives at the monorepo root, one level above this package (ADR-052): CI is
 * path-filtered to `app/**` and sets `working-directory: app`.
 */
const WORKFLOW = join(ROOT, '..', '.github', 'workflows', 'mobile.yml');

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

describe('the verification gate', () => {
  it('includes the formatting check, so a verified commit cannot carry unformatted files', () => {
    const { scripts } = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

    for (const step of GATE) {
      expect(scripts.verify).toContain(`npm run ${step}`);
    }
  });

  it('runs each of the gate’s checks in the CI job that guards a merge', () => {
    // The workflow is read as text: it is YAML, and what it says is which commands run. The
    // tests are the CI job's one step that spells its command differently — the coverage run,
    // because Jest's CI mode makes a changed snapshot fail instead of being written, and the
    // recorded floor is what the gate enforces on top of the suite.
    const workflow = readFileSync(WORKFLOW, 'utf8');

    for (const step of GATE.filter((candidate) => candidate !== 'test')) {
      expect(workflow).toContain(`npm run ${step}`);
    }
    expect(workflow).toContain('npm run test:coverage -- --ci');
  });

  it('enforces a floor for every coverage metric, read from one file', () => {
    const thresholds = JSON.parse(read('coverage-thresholds.json')) as Record<string, number>;

    for (const metric of ['statements', 'branches', 'functions', 'lines']) {
      expect(thresholds[metric]).toBeGreaterThan(0);
    }
    expect(read('jest.config.js')).toContain("require('./coverage-thresholds.json')");
  });
});
