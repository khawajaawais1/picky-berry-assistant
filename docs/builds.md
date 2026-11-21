# Building the app

**Expo Go is not a build target for this app.** The map is
`@maplibre/maplibre-react-native`, a custom native module that Expo Go does not contain
(ADR-002, ADR-031, ADR-051). Expo Go can serve only the JS/Expo-module screens; opening the map
or any screen that imports it fails. A real build — a development client or an installable
preview — is the supported way to run it on a phone.

## What to use

| Need                          | How                                                                                                                                                    | Profile     | Output                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------- |
| Quick JS/UI work, no map      | `cd app && npx expo start`; scan the QR in Expo Go                                                                                                     | —           | Metro dev server (not a build)                                         |
| Phone testing with hot reload | Actions → **build** → Run workflow, `development`, `android`; or locally `cd app && npx eas-cli@latest build --profile development --platform android` | development | Development client, installed once; then `npx expo start --dev-client` |
| Installable internal APK      | Actions → **build** → Run workflow, `preview`, `android`; or `npm run build:android:demo`                                                              | preview     | Standalone APK (no Metro)                                              |
| Release                       | `npm run release:prepare -- X.Y.Z`, merge, then tag `vX.Y.Z` on `main` — see [releasing.md](releasing.md)                                             | production  | GitHub Release with the Android AAB + APK, iOS linked when enabled     |

The `development` profile uses `expo-dev-client` (installed in `app/package.json`). The preview
profile is a standalone binary and needs no development client. `npm run apk` downloads the
newest finished Android build under a readable name.

## Triggering from CI

The workflow is [`.github/workflows/build.yml`](../.github/workflows/build.yml).

- **Version tag** — a `vMAJOR.MINOR.PATCH` tag on `main` is a release and runs
  [`release.yml`](../.github/workflows/release.yml), not this workflow: see
  [releasing.md](releasing.md).
- **Manual** — run the **build** workflow from the Actions tab and choose `platform`
  (`android` / `ios` / `all`) and `profile` (`development` / `preview` / `production`). This is
  how a branch is built: there is no build on every push to `main`, so EAS minutes are spent
  only when someone asks.
- The workflow verifies the commit (`npm run verify`) first, waits for the EAS build, writes
  build links to the run summary, and uploads the build JSON as an artifact. A failed build fails
  the job.

### One-time setup

1. Create an Expo access token: Expo → Account settings → Access tokens.
2. Add it as the repository secret **`EXPO_TOKEN`** (Settings → Secrets and variables → Actions).
   Without it the build job stops with a clear error rather than prompting.
3. iOS builds need Apple credentials in EAS. Set them up with `npx eas-cli@latest credentials`
   from `app/` before the first tag build; non-interactive CI cannot answer a credential prompt.
4. The project is already linked: `extra.eas.projectId` in `app/app.json`, profiles in
   `app/eas.json`.

## Branches versus tags

- **`main`** is the only branch that should be tagged for a release.
- **Any branch** can be built by manual dispatch; the workflow checks it out at its current
  head, so a feature branch produces a preview without merging.
- Feature branches are **verified** by `mobile.yml` on every PR; that workflow is verification
  only and never publishes.

## What this does not do

- **No OTA updates.** `expo-updates` is not installed; every JS change needs a new build.
- **No store submission.** Manual builds stop at the artifact. Releases can submit to Google Play
  (internal) and TestFlight behind a switch ([releasing.md](releasing.md)).
- **No Expo Go build.** As above, Expo Go cannot run the native map; use the development client
  or the preview APK.
