// Run with `npm run test:scripts` (Node's own test runner): these scripts run under plain Node in
// CI, so they are tested there too, not through the app's Jest preset.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  compareVersions,
  cutRelease,
  parseReleaseTag,
  releaseNotes,
  replaceVersionFields,
} from './changelog.mjs';

const CHANGELOG = `# Changelog

Intro paragraph.

## [Unreleased]

### Added

- A new screen.

### Fixed

- A crash.

## [1.0.0] - 2026-10-01

### Added

- The first release.

## 2026-09-01 — An undated-version section (#3)

- Older work.
`;

describe('parseReleaseTag', () => {
  it('reads the version out of a release tag', () => {
    assert.equal(parseReleaseTag('v1.2.3'), '1.2.3');
    assert.equal(parseReleaseTag('v10.0.12'), '10.0.12');
  });

  it('refuses anything that is not vMAJOR.MINOR.PATCH', () => {
    for (const tag of ['1.2.3', 'v1.2', 'v1.2.3-rc.1', 'v01.2.3', 'release/1.2.3', 'v1.2.3 ']) {
      assert.throws(() => parseReleaseTag(tag), /not a release tag/, tag);
    }
  });
});

describe('compareVersions', () => {
  it('orders versions numerically, not as text', () => {
    assert.ok(compareVersions('1.10.0', '1.9.0') > 0);
    assert.ok(compareVersions('0.1.0', '0.1.1') < 0);
    assert.equal(compareVersions('2.0.0', '2.0.0'), 0);
  });
});

describe('releaseNotes', () => {
  it('returns the body of the matching version section, without its heading', () => {
    assert.equal(releaseNotes(CHANGELOG, '1.0.0'), '### Added\n\n- The first release.');
  });

  it('stops at the next second-level heading of any shape', () => {
    const notes = releaseNotes(cutRelease(CHANGELOG, '1.1.0', '2026-11-21'), '1.1.0');
    assert.equal(notes, '### Added\n\n- A new screen.\n\n### Fixed\n\n- A crash.');
  });

  it('fails when the version has no section', () => {
    assert.throws(() => releaseNotes(CHANGELOG, '9.9.9'), /no "## \[9\.9\.9\]" section/);
  });

  it('fails when the section is empty', () => {
    const empty = CHANGELOG.replace(
      '## [1.0.0] - 2026-10-01',
      '## [2.0.0] - 2026-11-01\n\n## [1.0.0] - 2026-10-01',
    );
    assert.throws(() => releaseNotes(empty, '2.0.0'), /is empty/);
  });

  it('does not mistake a version that only starts the same for the one asked', () => {
    assert.throws(() => releaseNotes(CHANGELOG, '1.0'), /no "## \[1\.0\]" section/);
  });
});

describe('cutRelease', () => {
  it('moves the Unreleased entries under a dated version heading and leaves Unreleased empty', () => {
    const cut = cutRelease(CHANGELOG, '1.1.0', '2026-11-21');
    assert.match(
      cut,
      /## \[Unreleased\]\n\n## \[1\.1\.0\] - 2026-11-21\n\n### Added\n\n- A new screen\./,
    );
    assert.equal(cut.match(/## \[Unreleased\]/g).length, 1);
    assert.ok(cut.endsWith('- Older work.\n'));
  });

  it('refuses to cut a release with nothing unreleased', () => {
    const once = cutRelease(CHANGELOG, '1.1.0', '2026-11-21');
    assert.throws(() => cutRelease(once, '1.2.0', '2026-11-22'), /nothing under \[Unreleased\]/);
  });

  it('refuses a version that already has a section', () => {
    assert.throws(() => cutRelease(CHANGELOG, '1.0.0', '2026-11-21'), /already has a section/);
  });

  it('refuses a changelog without an Unreleased heading', () => {
    assert.throws(
      () => cutRelease('# Changelog\n', '1.0.0', '2026-11-21'),
      /no "## \[Unreleased\]"/,
    );
  });

  it('refuses a date that is not YYYY-MM-DD', () => {
    assert.throws(() => cutRelease(CHANGELOG, '1.1.0', '21.11.2026'), /YYYY-MM-DD/);
  });
});

describe('replaceVersionFields', () => {
  it('replaces only the first n "version" fields and keeps the formatting', () => {
    const lock =
      '{\n  "name": "x",\n  "version": "0.1.0",\n  "packages": {\n    "": {\n      "version": "0.1.0"\n    },\n    "node_modules/a": {\n      "version": "0.1.0"\n    }\n  }\n}\n';
    const next = replaceVersionFields(lock, '1.2.3', 2);
    assert.equal(next.match(/"version": "1\.2\.3"/g).length, 2);
    assert.match(next, /"node_modules\/a": \{\n {6}"version": "0\.1\.0"/);
  });

  it('fails when the file has fewer version fields than expected', () => {
    assert.throws(
      () => replaceVersionFields('{"name": "x"}', '1.0.0', 1),
      /found 0 "version" fields, expected 1/,
    );
  });
});
