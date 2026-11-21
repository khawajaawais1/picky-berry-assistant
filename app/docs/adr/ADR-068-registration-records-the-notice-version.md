# ADR-068 — Registration records the version of the notice the picker agreed to

- **Status:** Accepted (2026-11-21)
- **Date:** 2026-11-21
- **Deciders:** Project owner, on 2026-11-21, reporting that creating an account always showed
  "Your account wasn't created. Try again."
- **Amends:** [ADR-065](ADR-065-the-api-issues-the-credential.md): registration no longer sends
  empty consents. Answers the API integration plan's gap 5.
- **Related:** [ADR-039](ADR-039-frame-14s-two-remaining-rows-get-their-screens.md) (the device
  notice), [ADR-056](ADR-056-background-capture-is-out-of-scope.md) (no background location).

## Context

`POST /auth/register` refuses a registration that lacks `consents.terms_version` or
`consents.privacy_policy_version` (`422 CONSENT_REQUIRED`). The app sent `consents: {}` because no
written terms or privacy policy exist, so every account creation was refused, and the screen showed
its one failure line. Screen 03's consent row is required before submitting, and its link opens the
app's own device notice (`/terms-privacy`).

## Decision

1. **Both versions are the device notice's**: `CONSENT_NOTICE_VERSION`
   (`device-notice-2026-11-21`) in `features/onboarding/domain/create-account-form.ts`, sent by
   `registrationConsents()`. That notice is what the picker was shown and agreed to.
2. **Bump it whenever the notice's wording changes**, and replace it with the real documents'
   versions when the owner publishes the terms and the privacy policy.
3. **`background_location` is never sent**: the app reads no position in the background.
4. The e2e fake API refuses a registration without both versions, as the service does.

## Alternatives considered

1. **Invent a terms version.** Rejected: it would record agreement to a document that does not
   exist.
2. **Ask the backend to make the versions optional.** Rejected for now: recording what was agreed
   to is the right rule, and the app has an honest answer to give.

## Consequences

- Account creation works against the team API again.
- Accounts created before the real documents exist record agreement to the device notice only. When
  the terms are published, those accounts will need to agree again.
