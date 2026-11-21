/**
 * Turns the finished EAS builds of a release into what the GitHub Release carries: the Android
 * files to attach and a "Builds" section for the notes (docs/adr/ADR-069).
 *
 * The iOS archive is never attached. A production iOS build is signed for App Store distribution,
 * so no device can install the .ipa from a download: it reaches testers through TestFlight and
 * users through the App Store. The notes link its EAS build page instead.
 */

const ANDROID_KINDS = {
  aab: 'AAB, for Google Play',
  apk: 'APK, for installing directly',
};

function buildPage(project, build) {
  return `https://expo.dev/accounts/${project.owner}/projects/${project.slug}/builds/${build.id}`;
}

function extensionOf(url) {
  const match = /\.([a-z0-9]+)$/i.exec(new URL(url).pathname);
  return match ? match[1].toLowerCase() : '';
}

/**
 * @param {Array<object>} builds the objects `eas build --json` printed, one per build
 * @param {{ owner: string, slug: string, version: string, submitted?: boolean }} project
 * @returns {{ assets: Array<{ url: string, fileName: string }>, notes: string }}
 */
export function describeBuilds(builds, project) {
  if (builds.length === 0) throw new Error('there are no builds to release');

  const assets = [];
  const rows = [];
  let ios = null;

  for (const build of builds) {
    if (build.status !== 'FINISHED') throw new Error(`build ${build.id} is ${build.status}`);
    if (build.appVersion !== project.version) {
      throw new Error(
        `build ${build.id} is version ${build.appVersion}, the tag is ${project.version}`,
      );
    }
    const label = `${build.appVersion} (${build.appBuildVersion})`;
    const link = `[${build.id}](${buildPage(project, build)})`;

    if (build.platform === 'IOS') {
      ios = build;
      rows.push(`| iOS | App Store build, installed through TestFlight | ${label} | ${link} |`);
      continue;
    }

    const extension = extensionOf(build.artifacts?.buildUrl ?? 'https://invalid/');
    if (!(extension in ANDROID_KINDS)) {
      throw new Error(`build ${build.id}'s archive is not an .aab or .apk`);
    }
    assets.push({
      url: build.artifacts.buildUrl,
      fileName: `picky-${build.appVersion}-${build.appBuildVersion}.${extension}`,
    });
    rows.push(`| Android | ${ANDROID_KINDS[extension]} | ${label} | ${link} |`);
  }

  const lines = [
    '## Builds',
    '',
    '| Platform | Binary | Version (build) | EAS build |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
    ios
      ? 'The iOS archive is not attached: it is signed for App Store distribution, so it installs only through TestFlight or the App Store.'
      : 'iOS was not built for this release: iOS releases are off until the Apple credentials are set up (see docs/releasing.md).',
  ];
  if (project.submitted) {
    lines.push(
      '',
      'Store submission was requested: the AAB goes to the Google Play internal testing track' +
        (ios ? ' and the iOS build to TestFlight' : '') +
        '. The workflow run shows whether each submission succeeded.',
    );
  }

  return { assets, notes: lines.join('\n') };
}
