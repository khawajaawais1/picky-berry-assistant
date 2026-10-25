/**
 * Downloads a finished Android build from EAS and saves it under the app's own name.
 *
 * Why this exists: the file EAS serves is addressed by an artifact id — the demo build's link is
 * `https://expo.dev/artifacts/eas/h4rx_uaBL3CG66dmkbrwqT-BrxmvJ727r7-sQSNJNh8.apk` — so a
 * browser saves it under a name nobody can recognise, and no `app.json` or `eas.json` field
 * renames it: EAS names the artifact after its own build, not after the project. This script asks
 * EAS which builds exist, takes the newest finished Android one, and writes it as
 * `<name>-<version>-<version code>-<profile>.apk`, which is the name a tester expects to find in
 * their downloads folder. Nothing is built and no project file is touched.
 *
 * Usage:
 *
 *   npm run apk                 # the newest finished Android build
 *   npm run apk -- <build id>   # a particular build, finished or not
 *
 * Needs the EAS CLI logged in (`npx eas-cli@latest login`), the same login a build needs: the
 * artifact link is not public.
 */
// Imported rather than taken from the globals: this script is linted with the app's own
// configuration, which does not declare Node globals.
import { spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

/** The repository root: this file lives in `scripts/`. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** `npx` is a shell script on POSIX and an executable on Windows. */
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

/** Runs an `eas` subcommand and returns what it printed as JSON, or throws with its own reason. */
function easJson(args) {
  const result = spawnSync(
    NPX,
    ['--yes', 'eas-cli@latest', ...args, '--json', '--non-interactive'],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );

  if (result.error) throw new Error(`could not run the EAS CLI: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(
      `eas ${args.join(' ')} exited with ${result.status} — run \`npx eas-cli@latest login\` if this is a login problem`,
    );
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`eas ${args.join(' ')} did not print JSON:\n${result.stdout.slice(0, 400)}`);
  }
}

/** The archive a finished build offers, if it has one. */
function archiveOf(build) {
  return build.artifacts?.applicationBuildUrl ?? build.artifacts?.buildUrl ?? null;
}

/**
 * The name to save the artifact under: the app's own name, its version, the version code the build
 * carries and the profile it was built with. A field the build does not report is left out rather
 * than printed as `undefined`.
 */
function fileNameFor(app, build) {
  const parts = [
    app.name,
    build.appVersion ?? app.version,
    build.appBuildVersion,
    build.buildProfile,
  ].filter((part) => typeof part === 'string' && part !== '');

  return `${parts.join('-').replace(/[^a-zA-Z0-9._-]+/g, '-')}.apk`;
}

async function main() {
  const app = JSON.parse(await fs.readFile(path.join(ROOT, 'app.json'), 'utf8')).expo;
  const requested = process.argv[2];
  const builds = easJson(['build:list', '--platform', 'android', '--limit', '20']);

  const build = requested
    ? builds.find((candidate) => candidate.id === requested)
    : builds.find((candidate) => candidate.status === 'FINISHED' && archiveOf(candidate) !== null);

  if (!build) {
    throw new Error(
      requested
        ? `build ${requested} is not an Android build of this project`
        : 'no finished Android build with an artifact — run `npm run build:android:demo` first',
    );
  }

  const url = archiveOf(build);
  if (!url) throw new Error(`build ${build.id} has no archive (status ${build.status})`);

  const name = fileNameFor(app, build);
  const target = path.join(ROOT, name);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`EAS answered ${response.status} for ${url}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(target));
  const { size } = await fs.stat(target);

  console.log(
    `${name} — ${(size / 1024 / 1024).toFixed(1)} MB, build ${build.id} (${build.status})`,
  );
  console.log(target);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
