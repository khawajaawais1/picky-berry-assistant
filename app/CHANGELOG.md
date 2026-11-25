# Changelog

Notable changes to the Picky mobile app (`app/`). The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the app's version in `package.json`
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Decisions behind each change are
recorded in [docs/adr/](docs/adr/).

## [Unreleased]

### Added

- Reopening the app keeps a signed-in picker signed in: the root route reads the device's secure
  store and sends a held session to Discover instead of onboarding, painting a themed empty frame
  while the store is being read rather than flashing the welcome screen.

### Changed

- Discover's frosted glass is now one surface per control — the search field, the back and
  map/download buttons, the status line, the legend and each berry chip — instead of a panel across
  the top, so the map stays visible between them.
- The berry chips are one multi-select filter: all four start on, pressing one narrows the map, and
  a zone is drawn once with its best selected score and that berry's name. The last lit chip cannot
  be turned off, because an empty selection has no score layer to draw.

### Fixed

- A refresh that cannot reach the server no longer signs the picker out. Offline is not a sign-out:
  the device keeps the session it already holds, and only a refresh the server refuses ends it.

## [0.5.1] - 2026-11-25

### Added

- Appearance (light/dark/system) toggle in profile settings, persisted on this device.

### Changed

- Discover map overlays (search, berry layers, status, legend) now use frosted glass panels with a
  translucent fallback for older WebViews.

### Fixed

- Theme toggle is now a three-option chip group (System/Light/Dark) instead of a cycle button,
  with an accessible selected state.

## [0.5.0] - 2026-11-23

### Added

- The Discover map can show the picker's consented foreground position and follow it after the
  picker presses the location control. Map and visit tracking share one native watch; no raw fix is
  stored, sent or logged.

### Changed

- Discover is now an edge-to-edge MapLibre screen with floating search, berry layers, map controls,
  score legend and selected-zone card. Tapping a zone highlights it and updates the card, while
  native pan, pinch and eased camera movement keep the map responsive.

## [0.4.0] - 2026-11-22

### Added

- Ripe-berry alerts arrive as notifications (feature 6.7). The app reads the reasoning backend's
  `GET /api/v1/alerts` on start, on returning to the foreground and hourly while open, and shows
  the rule's own sentence as the text, e.g. "Ripe bilberry in zone Ukonvuori 4 — yield score 82,
  medium confidence." At most two a day, only scores of 70 or more that are not low confidence, and
  the same zone and berry at most once in three days. Nothing shows until alerts are allowed.
- Tapping an alert notification opens that zone's details for its berry, also when the tap starts
  the app. A backend FCM push carries the same data and opens the zone the same way.
- `EXPO_PUBLIC_REASONING_API_BASE_URL` points the app at another reasoning backend; unset, it
  reads `https://picky-backend-cd0u.onrender.com`.

### Changed

- The Alerts tab reads the reasoning backend instead of the team API's `/alerts`, which no deploy
  served. It lists the 20 best alerts with each one's sentence. Cards no longer show a time, a
  distance or the latest report, which the backend does not send, and the list is not yet filtered
  to the picker's berries or radius.

## [0.3.0] - 2026-11-22

### Added

- Every picker screen reads the team API instead of the design's samples. Visit reports get an id,
  are kept on the phone and sent to `POST /reports` after saving and whenever the app opens; the
  sync centre's "Send now" sends them for real.
- Visits shows the season from `GET /me/season` (harvest, kg/hour, zones, stay time, median stay,
  harvest by report) and the history from `GET /me/reports` plus the reports still queued; the
  period chips filter to this month.
- Zone details offers "See all reports" (`GET /zones/:id/reports`, anonymous, with a trust label)
  and "Navigate" for any served zone. Route to zone measures straight-line distance, heading and
  walking time from the phone and opens the maps app for walking directions.
- Alerts reads `GET /alerts`, filtered to the picker's position, radius and species; each alert
  opens its zone.
- The berry marketplace works end to end on `/market/*`: browse and search listings, a seller chat
  that sends messages, and an order form that reserves stock. A "Berry marketplace" row on the
  profile opens it.

### Changed

- In development, a `localhost` API address is reached from a phone or emulator through the Metro
  host (or `10.0.2.2` on the Android emulator), and plain http to a LAN address is accepted.

### Fixed

- The map loads in Expo Go: without MapLibre's native view the zones are drawn as an SVG, with a
  note that the street basemap needs a development build.

### Removed

- The first-launch demo seed, the design's sample zones, route, alert, season, downloads and
  marketplace data, and the community-map prototype. The bundled test zones remain only behind
  `EXPO_PUBLIC_ZONE_SOURCE=stub` for the layout harness, labelled as test data.

## [0.2.0] - 2026-11-21

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
