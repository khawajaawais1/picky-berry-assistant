# Changelog

Notable changes to the Picky mobile app (`app/`). The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the app's version in `package.json`
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Decisions behind each change are
recorded in [docs/adr/](docs/adr/).

## [Unreleased]

### Added

- Password reset asks the team API (`POST /auth/password-reset`) and says the request was
  accepted, without claiming an email was sent (ADR-065, amended).

### Fixed

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
