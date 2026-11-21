# Releasing the mobile app

How to cut a release of the Picky app (`app/`), what the pipeline does, and what has to be set up
once. The decision and its reasons are in
[app/docs/adr/ADR-069](../app/docs/adr/ADR-069-a-version-tag-releases-the-app.md); the workflow is
[`.github/workflows/release.yml`](../.github/workflows/release.yml). On-demand builds of a branch
are in [builds.md](builds.md).

## Cutting a release

Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html): a breaking change for
users or a data migration is a major, a new feature a minor, fixes only a patch.

1. **Prepare the version on a branch.** From an up-to-date `main`:

   ```bash
   cd app
   git switch -c release/v1.2.3
   npm run release:prepare -- 1.2.3
   ```

   This sets `1.2.3` in `app.json`, `package.json` and `package-lock.json`, and moves everything
   under `## [Unreleased]` in [`app/CHANGELOG.md`](../app/CHANGELOG.md) to
   `## [1.2.3] - <today>`. It refuses a version that is not newer, or an empty `[Unreleased]`.
   Read the new section: it becomes the release notes word for word. Edit it now if it needs it.

2. **Open a pull request** (`chore(release): v1.2.3`), let CI pass, and merge it.

3. **Tag the merged `main`** and push the tag:

   ```bash
   git switch main && git pull
   git tag -a v1.2.3 -m "Picky v1.2.3"
   git push origin v1.2.3
   ```

4. **Watch Actions → release.** When it is green, the release is at
   `https://github.com/khawajaawais1/picky-berry-assistant/releases/tag/v1.2.3`.

Only `vMAJOR.MINOR.PATCH` tags release (`v1.2.3-rc.1` does not). The tag must point at a commit on
`main`, and `app.json`, `package.json` and the CHANGELOG must already say `1.2.3`, or the run stops
before building anything.

## What the pipeline does

| Job     | What it does                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prepare | Checks the tag format, that it is on `main`, that the versions and CHANGELOG agree (`node scripts/release.mjs check`), and that `EXPO_TOKEN` is set                     |
| verify  | Runs the whole mobile gate (`mobile.yml`) on the tagged commit                                                                                                          |
| build   | EAS builds, one job each: Android AAB (`production`), Android APK (`release-apk`), iOS (`production`, only when `IOS_RELEASE_ENABLED` is `true`). Waits for each build |
| release | Publishes the GitHub Release **Picky v1.2.3**: CHANGELOG section + a table of builds as notes, the `.aab` and `.apk` attached, the iOS build linked                     |
| submit  | Only when switched on: `eas submit` of this run's builds to the Google Play internal track and TestFlight                                                               |

**Build numbers** are EAS's: `appVersionSource: remote` with `autoIncrement: true` gives every
production build the next `versionCode` (Android) and `buildNumber` (iOS). Do not set them in
`app.json`. The AAB and the APK of one release have different build numbers; the attached files
are named `picky-<version>-<build number>.aab|apk`.

**Why the iOS file is not attached:** a production iOS build is signed for App Store
distribution. No device installs that `.ipa` from a download, so the release links the EAS build
page, and testers get it through TestFlight.

**Re-running:** Actions → release → Run workflow, and choose the **tag** (not a branch) in "Use
workflow from". Tick "submit" to submit as well. A re-run replaces the release's notes and files.
After a single failed build, "Re-run failed jobs" rebuilds only that one.

## One-time setup

### Required for any release

| What                                | Where                                                    | How                                                                                                                                                                       |
| ----------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_TOKEN`                        | GitHub → Settings → Secrets and variables → Actions → Secrets | expo.dev → Account settings → Access tokens. A robot user's token with access to `@salmanprottoy/picky-mobile-app` only is better than a personal one                 |
| Android signing keystore            | EAS (`eas credentials`)                                  | Already exists if a preview build was made. The release runs with `--freeze-credentials`, so it never generates one: check with `cd app && npx eas-cli@latest credentials -p android` |
| `GOOGLE_SERVICES_JSON` (Firebase)   | EAS environment variable (file), `production` environment | Needed for push on Android (ADR-067). Without it the build succeeds and the phone cannot register for alerts                                                          |

### iOS (when the Apple account exists)

1. Join the Apple Developer Program and create the app `fi.picky.app` in App Store Connect.
2. From `app/`, run `npx eas-cli@latest credentials -p ios` and let EAS create the distribution
   certificate and provisioning profile for the `production` profile. CI cannot answer these
   prompts.
3. Set the repository **variable** `IOS_RELEASE_ENABLED` to `true` (Settings → Secrets and variables
   → Actions → Variables).

Until then, releases build and publish Android only, and say so in the notes.

### Store submission (when the store accounts exist)

The store credentials are stored in **EAS**, next to the signing credentials, not as GitHub
secrets: one place to rotate them, and no key file is ever written on a runner.

**Google Play — service account JSON key**

1. Create the app in the Play Console and **upload the first AAB by hand** (Google Play does not
   accept an API upload until one exists). The AAB attached to any GitHub Release will do.
2. Create a Google Cloud service account with access to the app in Play Console → Users and
   permissions, and download its JSON key
   ([Expo guide](https://github.com/expo/fyi/blob/main/creating-google-service-account.md)).
3. `cd app && npx eas-cli@latest credentials -p android` → production → Google Service Account →
   upload the key. Delete the local file afterwards.
4. `eas.json` already submits to the `internal` track. If the app has never been published in the
   Play Console, Play accepts only draft releases: add `"releaseStatus": "draft"` to
   `submit.production.android` until it has been.

**TestFlight — App Store Connect API key**

1. App Store Connect → Users and Access → Integrations → App Store Connect API: create a key with
   the App Manager role, and note the Key ID and Issuer ID; download the `.p8` once.
2. `cd app && npx eas-cli@latest credentials -p ios` → App Store Connect API key → add it.
3. Add the app's Apple ID (App Store Connect → the app → App Information → Apple ID) to `eas.json`
   as `submit.production.ios.ascAppId`, in a pull request. Non-interactive submission needs it.

**Switch it on**

- Every tag: set the repository variable `STORE_SUBMIT_ENABLED` to `true`.
- One release: Run workflow on the tag with "submit" ticked.
- Optional: Settings → Environments → `app-stores` → required reviewers, so a person approves each
  submission. The environment is created by the first run that submits.

Submission runs after the GitHub Release is published and submits that run's build ids, so the
store gets exactly the binary the release lists. Android submits only if Android was built, iOS
only if iOS was.

## When it fails

| Message                                                    | Fix                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `v1.2.3 cannot be released: app.json expo.version is …`    | The prepare pull request was not merged, or the tag is on the wrong commit. Delete the tag (`git push origin :v1.2.3`), merge, tag again |
| `points at a commit that is not on main`                   | Tag the merged `main`, not the release branch                                               |
| `EXPO_TOKEN is not set`                                    | Add the secret (above)                                                                      |
| EAS: credentials missing / `--freeze-credentials`          | Set up the credentials for that platform locally with `eas credentials`, then re-run      |
| `Submit with EAS` fails                                    | The release is already published; fix the store credentials and re-run with "submit"     |

A tag that was pushed by mistake and has not been released: delete it locally and on GitHub. A
published release is never deleted to reuse its version: release the next patch instead, since
stores and phones may already have that build.
