import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeBuilds } from './builds.mjs';

const PROJECT = { owner: 'acme', slug: 'picky-mobile-app', version: '1.2.3' };

const aab = {
  id: 'b-aab',
  platform: 'ANDROID',
  status: 'FINISHED',
  buildProfile: 'production',
  appVersion: '1.2.3',
  appBuildVersion: '42',
  artifacts: { buildUrl: 'https://expo.dev/artifacts/eas/x1.aab' },
};
const apk = {
  ...aab,
  id: 'b-apk',
  buildProfile: 'release-apk',
  appBuildVersion: '43',
  artifacts: { buildUrl: 'https://expo.dev/artifacts/eas/x2.apk' },
};
const ios = {
  id: 'b-ios',
  platform: 'IOS',
  status: 'FINISHED',
  buildProfile: 'production',
  appVersion: '1.2.3',
  appBuildVersion: '7',
  artifacts: { buildUrl: 'https://expo.dev/artifacts/eas/x3.ipa' },
};

describe('describeBuilds', () => {
  it('attaches the Android AAB and APK under readable names', () => {
    const { assets } = describeBuilds([aab, apk], PROJECT);
    assert.deepEqual(assets, [
      { url: 'https://expo.dev/artifacts/eas/x1.aab', fileName: 'picky-1.2.3-42.aab' },
      { url: 'https://expo.dev/artifacts/eas/x2.apk', fileName: 'picky-1.2.3-43.apk' },
    ]);
  });

  it('never attaches the iOS archive, and links its EAS build page instead', () => {
    const { assets, notes } = describeBuilds([aab, ios], PROJECT);
    assert.equal(assets.length, 1);
    assert.match(
      notes,
      /\| iOS \| App Store build, installed through TestFlight \| 1\.2\.3 \(7\) \| \[b-ios\]\(https:\/\/expo\.dev\/accounts\/acme\/projects\/picky-mobile-app\/builds\/b-ios\) \|/,
    );
    assert.match(notes, /not attached/);
  });

  it('says when iOS was not built', () => {
    const { notes } = describeBuilds([aab, apk], PROJECT);
    assert.match(notes, /iOS was not built for this release/);
  });

  it('says whether the store submission was requested', () => {
    assert.match(
      describeBuilds([aab], { ...PROJECT, submitted: true }).notes,
      /internal testing track/,
    );
    assert.doesNotMatch(describeBuilds([aab], PROJECT).notes, /internal testing track/);
  });

  it('refuses a build that did not finish', () => {
    assert.throws(
      () => describeBuilds([{ ...aab, status: 'ERRORED' }], PROJECT),
      /b-aab is ERRORED/,
    );
  });

  it('refuses a build of another version than the tag', () => {
    assert.throws(
      () => describeBuilds([{ ...aab, appVersion: '1.2.2' }], PROJECT),
      /b-aab is version 1\.2\.2, the tag is 1\.2\.3/,
    );
  });

  it('refuses an Android build whose archive is neither an AAB nor an APK', () => {
    const odd = { ...aab, artifacts: { buildUrl: 'https://expo.dev/artifacts/eas/x.zip' } };
    assert.throws(() => describeBuilds([odd], PROJECT), /not an \.aab or \.apk/);
  });

  it('refuses an empty list', () => {
    assert.throws(() => describeBuilds([], PROJECT), /no builds/);
  });
});
