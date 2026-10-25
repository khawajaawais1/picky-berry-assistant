#!/usr/bin/env node
/**
 * Points this clone's Git hooks at `app/.githooks` (the pre-commit secret scan).
 *
 * The app is an npm package inside a monorepo whose root has no `package.json`, and Husky
 * only wires a repository from its root, so `prepare` runs this script instead of a hook
 * framework. It is idempotent: running it again costs one `git config` read, and outside a
 * checkout (a packed install, a tarball) it does nothing.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(dirname(fileURLToPath(import.meta.url)));
const hooksPath = 'app/.githooks';

function git(args) {
  return execFileSync('git', args, { cwd: appDir, encoding: 'utf8' }).trim();
}

let root;
try {
  root = git(['rev-parse', '--show-toplevel']);
} catch {
  process.exit(0);
}

if (!existsSync(join(root, hooksPath, 'pre-commit'))) {
  // Loud, because a checkout that lost the hook must not look like one that installed it.
  console.error(
    `install-git-hooks: ${hooksPath}/pre-commit is missing; the hook was not installed.`,
  );
  process.exit(1);
}

let current = '';
try {
  current = git(['config', '--local', '--get', 'core.hooksPath']);
} catch {
  // Unset is the normal first run.
}

if (current === hooksPath) {
  console.log(`install-git-hooks: core.hooksPath already points at ${hooksPath}.`);
} else {
  git(['config', '--local', 'core.hooksPath', hooksPath]);
  console.log(
    `install-git-hooks: core.hooksPath -> ${hooksPath}${current ? ` (was ${current})` : ''}.`,
  );
}
