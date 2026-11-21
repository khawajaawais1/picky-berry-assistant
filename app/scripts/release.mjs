/**
 * Release helper for the app (docs/releasing.md, docs/adr/ADR-069).
 *
 *   npm run release:prepare -- 1.2.3 [--date YYYY-MM-DD]
 *       Sets the version in app.json, package.json and package-lock.json and moves the CHANGELOG's
 *       [Unreleased] entries under "## [1.2.3] - date". Run on a branch; merge; then tag main.
 *
 *   node scripts/release.mjs check v1.2.3
 *       Fails unless the tag, app.json, package.json and a non-empty CHANGELOG section agree.
 *
 *   node scripts/release.mjs plan v1.2.3 <builds-dir> <out-dir> [--submitted]
 *       Reads the `eas build --json` files in <builds-dir> and writes <out-dir>/notes.md (the
 *       CHANGELOG section plus a Builds table) and <out-dir>/assets.tsv (url, file name).
 *
 * Plain Node, no dependencies: the release workflow runs it before `npm ci`.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { describeBuilds } from './release/builds.mjs';
import {
  compareVersions,
  cutRelease,
  parseReleaseTag,
  releaseNotes,
  replaceVersionFields,
} from './release/changelog.mjs';

/** The app's folder: this file lives in `scripts/`. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const read = (file) => fs.readFile(path.join(ROOT, file), 'utf8');
const write = (file, text) => fs.writeFile(path.join(ROOT, file), text);

async function manifest() {
  const app = JSON.parse(await read('app.json')).expo;
  const pkg = JSON.parse(await read('package.json'));
  return { app, pkg };
}

async function prepare(version, date) {
  parseReleaseTag(`v${version}`);
  const { app } = await manifest();
  if (compareVersions(version, app.version) <= 0) {
    throw new Error(`${version} is not newer than the current version ${app.version}`);
  }

  const changelog = cutRelease(await read('CHANGELOG.md'), version, date);
  await write('CHANGELOG.md', changelog);
  await write('app.json', replaceVersionFields(await read('app.json'), version, 1));
  await write('package.json', replaceVersionFields(await read('package.json'), version, 1));
  await write(
    'package-lock.json',
    replaceVersionFields(await read('package-lock.json'), version, 2),
  );

  console.log(`Prepared ${version}. Next:`);
  console.log(
    `  git switch -c release/v${version} && git commit -am "chore(release): v${version}"`,
  );
  console.log('  open a pull request, merge it, then on the merged main:');
  console.log(`  git tag -a v${version} -m "Picky v${version}" && git push origin v${version}`);
}

async function check(tag) {
  const version = parseReleaseTag(tag);
  const { app, pkg } = await manifest();
  const problems = [];
  if (app.version !== version) problems.push(`app.json expo.version is ${app.version}`);
  if (pkg.version !== version) problems.push(`package.json version is ${pkg.version}`);
  try {
    releaseNotes(await read('CHANGELOG.md'), version);
  } catch (error) {
    problems.push(error.message);
  }
  if (problems.length > 0) {
    throw new Error(
      `${tag} cannot be released:\n- ${problems.join('\n- ')}\n` +
        `Run \`npm run release:prepare -- ${version}\` on a branch and merge it before tagging.`,
    );
  }
  console.log(`${tag}: app.json, package.json and CHANGELOG.md agree on ${version}`);
}

async function plan(tag, buildsDir, outDir, submitted) {
  const version = parseReleaseTag(tag);
  const { app } = await manifest();

  const builds = [];
  for (const entry of (await fs.readdir(buildsDir, { recursive: true })).sort()) {
    if (!entry.endsWith('.json')) continue;
    const parsed = JSON.parse(await fs.readFile(path.join(buildsDir, entry), 'utf8'));
    builds.push(...(Array.isArray(parsed) ? parsed : [parsed]));
  }

  const { assets, notes } = describeBuilds(builds, {
    owner: app.owner,
    slug: app.slug,
    version,
    submitted,
  });
  const changes = releaseNotes(await read('CHANGELOG.md'), version);

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'notes.md'), `${changes}\n\n${notes}\n`);
  await fs.writeFile(
    path.join(outDir, 'assets.tsv'),
    assets.map((asset) => `${asset.url}\t${asset.fileName}\n`).join(''),
  );
  console.log(`${builds.length} builds, ${assets.length} files to attach`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function main(argv) {
  const [command, ...args] = argv;
  const flag = (name) => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args.splice(index, 2)[1];
  };

  switch (command) {
    case 'prepare': {
      const date = flag('--date') ?? today();
      if (!args[0]) throw new Error('usage: release.mjs prepare <version> [--date YYYY-MM-DD]');
      return prepare(args[0].replace(/^v/, ''), date);
    }
    case 'check':
      if (!args[0]) throw new Error('usage: release.mjs check <tag>');
      return check(args[0]);
    case 'plan': {
      const submitted = args.includes('--submitted');
      const [tag, buildsDir, outDir] = args.filter((arg) => arg !== '--submitted');
      if (!outDir)
        throw new Error('usage: release.mjs plan <tag> <builds-dir> <out-dir> [--submitted]');
      return plan(tag, path.resolve(buildsDir), path.resolve(outDir), submitted);
    }
    default:
      throw new Error('usage: release.mjs prepare|check|plan … (see the comment at the top)');
  }
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
