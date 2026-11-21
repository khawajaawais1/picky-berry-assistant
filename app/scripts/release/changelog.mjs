/**
 * The release rules that read and write text: the tag format, the CHANGELOG's version sections
 * (Keep a Changelog 1.1.0) and the version fields in the JSON manifests. Pure functions, so the
 * release workflow and `npm run release:prepare` share one tested implementation
 * (docs/adr/ADR-069).
 */

/** `vMAJOR.MINOR.PATCH`, no leading zeros, no pre-release suffix: the only tags that release. */
const RELEASE_TAG = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const UNRELEASED = /^## \[Unreleased\][^\n]*$/m;

/** Any second-level heading: version sections and the older dated ones alike. */
const NEXT_SECTION = /^## /m;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The version a release tag names, or throws when the tag is not one. */
export function parseReleaseTag(tag) {
  const match = RELEASE_TAG.exec(tag);
  if (!match) throw new Error(`"${tag}" is not a release tag: expected vMAJOR.MINOR.PATCH`);
  return `${match[1]}.${match[2]}.${match[3]}`;
}

/** Negative, zero or positive as `a` is older than, equal to or newer than `b`. */
export function compareVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

/** The body after `heading` up to the next second-level heading, trimmed. */
function sectionBody(changelog, headingIndex) {
  const afterHeading = changelog.indexOf('\n', headingIndex);
  if (afterHeading === -1) return '';
  const rest = changelog.slice(afterHeading + 1);
  const end = rest.search(NEXT_SECTION);
  return (end === -1 ? rest : rest.slice(0, end)).trim();
}

function versionHeading(version) {
  return new RegExp(`^## \\[${escapeRegExp(version)}\\](?: - [^\\n]*)?$`, 'm');
}

/** The release notes for `version`: its CHANGELOG section without the heading. */
export function releaseNotes(changelog, version) {
  const heading = versionHeading(version).exec(changelog);
  if (!heading) throw new Error(`CHANGELOG.md has no "## [${version}]" section`);
  const body = sectionBody(changelog, heading.index);
  if (body === '') throw new Error(`CHANGELOG.md's "## [${version}]" section is empty`);
  return body;
}

/**
 * Moves everything under `## [Unreleased]` into a new `## [version] - date` section, leaving an
 * empty Unreleased heading above it for the next change.
 */
export function cutRelease(changelog, version, date) {
  if (!ISO_DATE.test(date)) throw new Error(`"${date}" is not a YYYY-MM-DD date`);
  if (versionHeading(version).test(changelog)) {
    throw new Error(`CHANGELOG.md already has a section for ${version}`);
  }
  const unreleased = UNRELEASED.exec(changelog);
  if (!unreleased) throw new Error('CHANGELOG.md has no "## [Unreleased]" heading');
  if (sectionBody(changelog, unreleased.index) === '') {
    throw new Error('there is nothing under [Unreleased] to release');
  }

  const end = unreleased.index + unreleased[0].length;
  return `${changelog.slice(0, end)}\n\n## [${version}] - ${date}${changelog.slice(end)}`;
}

/**
 * Sets the first `count` `"version": "…"` fields of a JSON manifest, as text, so the file keeps
 * the formatting Prettier gave it (`app.json`, `package.json`: 1; `package-lock.json`: 2, the
 * root and `packages[""]`).
 */
export function replaceVersionFields(text, version, count) {
  const field = /("version":\s*")[^"]*(")/g;
  const found = text.match(field)?.length ?? 0;
  if (found < count) {
    throw new Error(`found ${found} "version" fields, expected ${count}`);
  }
  let replaced = 0;
  return text.replace(field, (whole, open, close) => {
    replaced += 1;
    return replaced <= count ? `${open}${version}${close}` : whole;
  });
}
