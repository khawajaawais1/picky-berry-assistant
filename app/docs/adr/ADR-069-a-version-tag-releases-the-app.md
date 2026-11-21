# ADR-069 — A version tag on main releases the app

- **Status:** Accepted (2026-11-21)
- **Date:** 2026-11-21
- **Deciders:** Project owner, asking for a release pipeline that builds both platforms with EAS,
  publishes a GitHub Release with the changelog and the binaries, and can submit to the stores.
- **Amends:** [ADR-008](ADR-008-quality-tooling-and-ci.md): CI now has a workflow that publishes.
  `mobile.yml` is still verification only; `release.yml` calls it before it builds.
- **Related:** [docs/releasing.md](../../../docs/releasing.md) (the runbook),
  [docs/builds.md](../../../docs/builds.md) (on-demand builds).

## Context

`build.yml` built the production profile for every `v*` tag and stopped there: no GitHub Release,
no notes, no files anyone could download, no store submission. The app's version (`0.1.0` in
`app.json` and `package.json`) had never been changed, and nothing tied a tag to it, so a tag
could name one version while the binary reported another. `eas.json` already keeps the build
number on EAS (`appVersionSource: remote`) but production builds did not increment it. No Apple
Developer or App Store Connect credentials exist yet, and the store accounts are the owner's.

## Decision

1. **The trigger is an annotated `vMAJOR.MINOR.PATCH` tag on a commit already on `main`.**
   `release.yml` owns those tags; `build.yml` no longer builds tags, so one tag is built once. A
   tag on a commit outside `main`, or a pre-release suffix, does not release.
2. **The version lives in the repository, and the tag must agree with it.** Before a tag,
   `npm run release:prepare -- X.Y.Z` sets `expo.version` in `app.json`, `version` in
   `package.json` and `package-lock.json`, and moves the CHANGELOG's `[Unreleased]` entries under
   `## [X.Y.Z] - YYYY-MM-DD`. That change is reviewed in a pull request like any other. The
   workflow fails before building when the tag, `app.json`, `package.json` and a non-empty
   CHANGELOG section disagree. CI never edits or commits the version.
3. **Build numbers belong to EAS.** The production profile sets `autoIncrement: true` with the
   existing `appVersionSource: remote`, so every store build gets the next `versionCode` /
   `buildNumber` and nobody keeps one in git.
4. **The tagged commit passes the whole mobile gate first.** `mobile.yml` is callable
   (`workflow_call`) and `release.yml` runs it before spending EAS build minutes.
5. **Three builds, each its own job:** the production AAB (for Google Play), an APK from the new
   `release-apk` profile (extends production; for installing directly), and iOS production. The
   iOS job runs only when the repository variable `IOS_RELEASE_ENABLED` is `true`, so releases work
   before the Apple account exists. Builds run with `--freeze-credentials`: a release never
   creates a signing key, because a new Android keystore would make later Play updates
   uninstallable over this one.
6. **The GitHub Release is "Picky vX.Y.Z"**, its notes are the CHANGELOG section plus a table of
   the builds, and it carries the AAB and APK. The iOS build is linked to its EAS page, not
   attached: an App Store-signed `.ipa` installs only through TestFlight or the App Store, so
   attaching it would offer a download nobody can use.
7. **Store submission is behind a switch.** It runs only when the repository variable
   `STORE_SUBMIT_ENABLED` is `true` or a manual run asks for it, after the release is published,
   in the `app-stores` environment (which can require a reviewer). It submits the exact builds
   the run made (`eas submit --id`) to the Play internal track and TestFlight. The Play service
   account key and the App Store Connect API key are stored in EAS, not in GitHub; the only
   release secret in GitHub is `EXPO_TOKEN`.
8. **The EAS CLI version is pinned** in the workflow (27.4.1) and moves in its own pull request.

## Alternatives considered

1. **Release when a `release/*` branch is merged.** Rejected: the merge commit is not a stable,
   named point (a branch can be re-merged, renamed or deleted), the version would have to be read
   out of the branch name or the files, and a re-run would need the branch to still exist. A tag
   names one commit forever, is what `git describe`, GitHub Releases and `eas build --message`
   already use, and can be pushed only by someone with write access. `release/vX.Y.Z` stays as the
   usual name for the pull request that prepares a version.
2. **Let CI bump the version from the tag.** Rejected: the built commit would differ from the
   tagged one, the bump would need a bot with push access to `main`, and the CHANGELOG cut would
   never be reviewed.
3. **`eas build --platform all` in one job.** Rejected: one missing iOS credential would fail
   Android too, and a re-run would rebuild both.
4. **`eas build --auto-submit`.** Rejected: the submission would run inside EAS after the CI job
   ends, so the run could not show whether it reached the store, and it would run before the
   GitHub Release exists.
5. **Expo's EAS Workflows instead of GitHub Actions.** Not now: the repository's gates, secrets
   scan and linting are GitHub Actions, and the release should run the same gate. Waiting on the
   build costs runner minutes; worth revisiting if that becomes a cost.
6. **Store credentials as GitHub secrets.** Rejected: EAS already holds the signing credentials,
   keeping the store keys beside them means one place to rotate and no key file written on a
   runner.

## Consequences

- Cutting a release is two steps: a reviewed `release:prepare` pull request, then a tag on the
  merged `main` ([docs/releasing.md](../../../docs/releasing.md)).
- Every release has downloadable Android files and notes that match the CHANGELOG.
- The APK and the AAB of one release carry different build numbers (each build increments it).
- iOS appears in releases once the owner adds the Apple credentials to EAS and sets
  `IOS_RELEASE_ENABLED`; store submission once the store accounts exist and
  `STORE_SUBMIT_ENABLED` is set. Google Play requires the very first upload of an app to be made
  by hand in the Play Console.
- A release job holds a runner while EAS builds (up to two hours per build).
