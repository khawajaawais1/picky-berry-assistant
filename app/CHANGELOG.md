# Changelog

Notable changes to the Picky mobile app (`app/`). The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the app's version in `package.json`
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Decisions behind each change are
recorded in [docs/adr/](docs/adr/).

## [Unreleased]

### Added

- A release pipeline (`.github/workflows/release.yml`): a `vX.Y.Z` tag on `main` runs the mobile
  gate, builds the Android AAB, a sideload APK (new `release-apk` profile) and, once enabled, iOS
  with EAS, and publishes a GitHub Release "Picky vX.Y.Z" with this file's section as its notes.
  Submission to Google Play (internal) and TestFlight is behind a switch.
  `npm run release:prepare -- X.Y.Z` sets the version and cuts this file (ADR-069,
  [docs/releasing.md](../docs/releasing.md)).
- Frame 12's alert-preferences card reads and saves the account's search radius and species
  (`PATCH /me`), through a new app-drawn Alert preferences screen. Quiet hours reads "Not offered
  yet", because the API has no field for it (ADR-067).
- Push alerts: the card's switch asks for the notification permission and registers this phone's
  native token with `POST /me/devices`; the shell re-registers on each start. Turning alerts off
  opens the phone's settings. Adds `expo-notifications` and its config plugin. Real tokens need
  the Firebase and APNs configuration in the build.
- Frame 14's "Default spot visibility" chips save `privacy_level` (`PATCH /me/privacy`).
- A Language screen behind frame 14's Language row saves the account's language, and the app
  speaks it while that account is signed in (amends ADR-017).
- The account's name can be edited on Account & security.
- Password reset asks the team API (`POST /auth/password-reset`) and says the request was
  accepted, without claiming an email was sent (ADR-065, amended).

### Changed

- Production EAS builds auto-increment the build number EAS keeps (`autoIncrement`), and a tag no
  longer starts a build from `build.yml`, which is now for on-demand builds only.

### Fixed

- The alerts switch no longer throws on Android when the platform will not create the notification
  channel, and Expo Go (which has no remote push since SDK 53) reads as unable to receive alerts.
- Builds made with EAS (`development`, `preview`, `production`) now carry the API address
  (`EXPO_PUBLIC_API_BASE_URL`). Without it every request failed before leaving the phone, so
  account creation always failed.
- The create-account screen now says why it failed: an address that may already have an account,
  or an account service it could not reach. Before, every failure read "Your account wasn't
  created. Try again."
- Creating an account no longer always fails with "Your account wasn't created". The API requires
  terms and privacy-policy versions (`422 CONSENT_REQUIRED`), and the app sent none. It now sends
  the version of the device notice the consent row opens (ADR-068).
- A reset request the service accepted (`202` with no body) no longer reads as failed: the
  transport skips the body for requests that declare `expectsBody: false`.
- A rate-limited, missing or failing `/auth/refresh` no longer signs the picker out: only the server
  refusing the refresh token ends the session. The transport now answers one verdict per failure
  (`failureVerdict`: retry, refused or unavailable), and the session, reset, account-delete and
  visits adapters read it instead of their own status rules.
- A throttled account delete no longer says the password didn't match, and a throttled sign-in or
  reset request reads as unavailable rather than refused.
- A finished visit stays in the outbox when the deploy has no `/visits` route (404), instead of
  being dropped as refused.
- `TESTING.md` no longer claims Playwright is pinned to an exact 1.63.0: it is a caret range, and
  `package.json` is where the version is read.

### Removed

- The Firebase password-reset adapter and `EXPO_PUBLIC_FIREBASE_API_KEY`. The app carries no
  third-party key.
- The reset screen's "Test build" note, which only described the stand-in.

## 2026-11-21 — Team API integration (#23)

### Added

- One transport to the team API (`src/services/api/`): bearer tokens, a single refresh on 401, and
  every response validated (ADR-065).
- Accounts and sessions against the API, with tokens in `expo-secure-store` (ADR-006).
- Zones, zone details (reasons, reports, history), the offline snapshot, visits and the account's
  profile, export and deletion, all from the API.
- The visit tracker, mounted in the app shell under consent and foreground permission, with a
  durable outbox for finished visits (ADR-066).

### Changed

- Password rules follow the API: 10-128 characters, a name of at most 30.
- Expo packages aligned with the SDK 58 patch releases.

### Removed

- The stand-in session port (ADR-054 decision 8).
