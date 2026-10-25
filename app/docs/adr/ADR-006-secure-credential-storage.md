# ADR-006 — Credentials in platform secure storage

- **Status:** Accepted (to be implemented with the first authentication work)
- **Date:** 2026-10-08
- **Deciders:** Project owner (bootstrap specification §17)

## Context

The app will authenticate users and hold access/refresh tokens, and later store
personal data (identity, location-derived history, media). On a rooted/jailbroken
or backed-up device, anything in ordinary application storage — AsyncStorage, plain
files, SQLite without encryption — is readable, and it may be swept into device
backups or readable by other software on the device.

The specification forbids storing authentication material in ordinary unencrypted
local storage and forbids secrets in the client bundle.

## Decision

1. **Tokens and secrets** are stored exclusively through platform secure storage —
   iOS Keychain, Android Keystore/EncryptedSharedPreferences. Implementation will
   use `expo-secure-store` behind a small `src/services/storage` adapter so only one
   module touches the platform API and it can be mocked in tests.
2. **Never** in `AsyncStorage`, plain files, Redux/Zustand persisted state, URL
   schemes, deep-link parameters, logs, crash reports or analytics.
3. `EXPO_PUBLIC_*` variables are public by definition: they may only carry
   non-secret configuration (API base URL, environment name), and only
   `src/config/env.ts` reads them. No server credential, private key or signing
   material ever ships in the client.
4. Tokens are attached to requests by the API adapter only, are never logged, and
   are cleared on sign-out and on refresh failure. Keychain accessibility is set so
   secrets are available only to the app and (where supported) only while the
   device is unlocked.
5. Personal and cached sensitive data that must be stored locally uses the same
   secure/encrypted path when the entity requires it; the decision for each entity
   is recorded with that entity (see ADR-005).

## Alternatives considered

1. **AsyncStorage with app-level encryption** — the key itself must live somewhere
   on the device, so this only raises the bar marginally and adds a crypto
   implementation to review. Rejected.
2. **A generic encrypted store library with a custom crypto layer** — more code to
   audit and platform quirks to handle, for no benefit over the OS facilities.
   Rejected.
3. **In-memory only (re-authenticate every launch)** — most secure, unacceptable
   UX for field use with intermittent connectivity. Rejected.
4. **Custom native storage module** — no requirement justifies owning native code
   here. Rejected; `expo-secure-store` is the managed-workflow equivalent.

## Consequences

Positive: tokens are protected by OS-grade facilities; a single adapter makes the
storage boundary testable and swappable; the rule is simple enough to enforce in
review.

Negative / accepted costs: `expo-secure-store` is a native module, so a development
build is required (Expo Go cannot load it) and it is not installed yet — this ADR
must be implemented before any credential is persisted; secure storage is slower
than AsyncStorage, so only credentials (not bulk data) belong there; on web, secure
storage is unavailable, which must be handled explicitly rather than silently
falling back to localStorage.

## Related

- Bootstrap specification §17
- SECURITY.md §9, ADR-005 (offline data), PROJECT.md (authentication is unbuilt)
