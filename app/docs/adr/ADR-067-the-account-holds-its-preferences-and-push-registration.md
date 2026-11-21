# ADR-067 — The account holds its preferences, and the phone registers for push

- **Status:** Accepted (2026-11-21)
- **Date:** 2026-11-21
- **Deciders:** Project owner, on 2026-11-21: asked to build "the missing screen according to our
  app design" and push notifications. Chose, out of the controls the design draws as samples or not
  at all, all four (alert preferences, spot visibility, the language screen, the nickname), and
  "build it, config later" for push.
- **Supersedes:** [ADR-043](ADR-043-three-waiting-frame-parts-get-their-answers.md)'s sample
  treatment of frame 12's preferences card, wherever the account service is connected;
  [ADR-017](ADR-017-localization.md)'s "no in-app language picker".
- **Related:** [ADR-039](ADR-039-frame-14s-two-remaining-rows-get-their-screens.md) (frame 14's
  app-drawn screens), [ADR-056](ADR-056-background-capture-is-out-of-scope.md) (no background
  location), [ADR-065](ADR-065-the-api-issues-the-credential.md) (the team API).

## Context

The team API now owns the account's settings: `PATCH /me` takes a nickname (1–30 characters), an
alert radius (1–100 whole km), the species the alerts are about and a language (`fi`/`en`);
`PATCH /me/privacy` takes a spot visibility (`private`/`shared`/`public`); `POST /me/devices` takes
a push token (`fcm_token`) and a platform. The design already draws most of these: frame 12's
preferences card (push switch, radius, quiet hours, species) was a sample because nothing read it,
and frame 14's "Default spot visibility" chips and "Language" row were left out or kept as a
reading because no record stood behind them. The backend stores the push token and sends nothing.

## Decision

1. **The profile is the account's, read once and shared.** `useAccountProfile` reads `GET /me` once
   per account and service, and every save goes through it, so a screen underneath on the stack
   reads what the screen on top saved. Nothing is persisted on the phone: it is the service's
   record, and `held-records.ts` gains nothing.
2. **Frame 12's card is live with the account service.** The radius and species are the account's,
   changed on an app-drawn **Alert preferences** screen (`/alert-preferences`) that the two rows
   open. A species code the app cannot name is left out of the card and kept on the account.
   **Quiet hours** has no field in the contract, so the row reads "Not offered yet" instead of the
   design's 21:00–07:00. A line says the settings are saved to the account and the service sends no
   alert yet. Without the service (the layout harness's stub build), the card stays ADR-043's sample.
3. **The push switch is the platform's permission.** On asks for it — only from the press — and
   registers the phone. Off opens the phone's settings, because an app cannot take its own
   permission back. Denied says so and offers the settings; the web build draws no switch and says
   it cannot receive alerts.
4. **The phone registers itself.** The shell's `PushRegistration` hands the native token (FCM on
   Android, APNs on iOS, from `expo-notifications`) to `POST /me/devices` on each start and for each
   account, once the permission is granted, with the app's version. It never asks for the
   permission. A build without its Firebase/APNs configuration gets no token, and the card says the
   phone could not be registered. Android creates the `alerts` channel before asking (Android 13).
5. **Frame 14's "Default spot visibility" chips are drawn** once the account's level has been read,
   saving `privacy_level`. Their note says the level is kept for when sharing arrives and nothing
   is shown to anyone yet. `background_location` is never sent (ADR-056).
6. **The Language row opens an app-drawn Language screen** (`/language`). The two languages are
   named in their own words. The choice is saved to the account, and the app speaks it once the
   account has kept it (`setAppLocale`). While an account is signed in, the shell's
   `AccountLanguage` makes the app follow `lang`; a signed-out app, and a cold start before the
   profile is read, follow the device. Sign-out puts the device's language back.
7. **The nickname is editable on Account & security**, checked against 1–30 characters before
   sending. The account rows draw the saved name at once.

## Alternatives considered

1. **Keep the controls as samples until the backend sends alerts.** Rejected by the owner, and the
   settings are real records on the account now.
2. **Expo push tokens instead of native tokens.** Rejected: the API takes an FCM token, and Expo's
   service would need a backend change.
3. **A stored push "on" flag the switch writes.** Rejected: it would be a new record on the phone
   that disagrees with the platform whenever the picker changes the permission in the settings.
4. **Persist the chosen language on the phone.** Rejected: a new held record, when the account
   already keeps it. The cost is a cold start in the device's language until the profile answers.
5. **TanStack Query for the profile.** Rejected for now: the profile screens render without a query
   provider in their tests, and the shared store is small.

## Consequences

- There is no `DELETE` for a device: signing out leaves the token registered at the service until
  the account is deleted. The service sends nothing yet, so nothing arrives; a device endpoint is a
  backend follow-up.
- Real tokens need the build's Firebase project (`google-services.json`) and an APNs key in EAS.
  Until then, devices answer no token and say so.
- The layout harness's stub build keeps frame 12's sample card and the device's language
  (`appProfileApi` is undefined there), so the frames are measured as before.
- `ALERT_RADII_KM` offers 1, 3, 5, 10, 25, 50 and 100 km, plus the account's own value if it is not
  one of them.
