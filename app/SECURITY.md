# SECURITY.md — Picky security baseline

The permanent security baseline. These requirements are mandatory for every
change unless a documented technical analysis shows a control is not applicable
to this project — in which case record that analysis here or in an ADR.

Last updated: 2026-10-25 (Android backup, the deep-link surface and CI secret scanning
recorded from a mobile-checklist review; dependency advisories in §17).

## 1. Threat model in one paragraph

The mobile client is fully untrusted: an attacker can read the shipped bundle,
inspect local storage, modify the app, and call the API directly with any payload.
Location data, media evidence and identity are the sensitive assets. The realistic
adversaries are (a) a curious or malicious authenticated user probing other
users' data, (b) a modified client replaying or forging requests, (c) someone
harvesting GPS traces or personal data, and (d) dependency/supply-chain
compromise.

## 2. Ten questions to answer for every feature

1. What can an attacker control? 2. What data is sensitive? 3. What authorisation
is required? 4. Which input is untrusted? 5. What happens if requests are
replayed? 6. What happens if the user is malicious? 7. What happens if the client
is modified? 8. What happens if the API is called directly, bypassing the app?
9. What data can leak (logs, errors, analytics, screenshots)? 10. What abuse and
rate-limit scenarios exist?

If a feature cannot answer these, it is not ready.

## 3. Never trust the mobile client

Security-critical decisions are enforced server-side: authorization, ownership,
roles, permissions, pricing, scoring, privacy toggles and notification decisions.
Client-side checks are UX affordances only. Assume any client check has been
removed. GPS claims are untrusted input until the server validates them.

## 4. Injection and input handling

- Validate every external input at its boundary: API responses, deep links,
  user input, uploaded files, push payloads, stored values read back from disk.
- Never build SQL, filters or queries from string concatenation; parameterised
  queries or safe ORM usage only. No dynamic SQL.
- Treat strings that end up in a WebView, log, header or notification as
  untrusted: no XSS/CRLF/format-string injection.
- Prefer allow-lists over deny-lists, and validate types, ranges, lengths and
  encodings — not just presence.

## 5. Authentication and authorization

- Secure password hashing server-side (Argon2id or bcrypt with a documented
  cost); never store or log plaintext credentials.
- Strong, rotatable JWT/secret material from environment/secret management; short
  access-token lifetimes with refresh; no hard-coded credentials anywhere.
- Token revocation and secure password reset flows.
- MFA for privileged accounts and sensitive operations once roles exist.
- Every request authorises the *specific object*: no IDOR/BOLA. Ownership is
  derived from the authenticated principal, never from a client-supplied user id.
- PostgreSQL row-level security where the multi-user data model benefits from it.
- Least privilege for every database and service account.

## 6. API boundary

- HTTPS/TLS only; no clear-text transport outside loopback development.
- Rate limiting and abuse protection on authentication, write and media endpoints.
- Strict CORS; no wildcard + credentials combination.
- **CSRF:** the mobile client will authenticate with bearer tokens in the
  `Authorization` header, not ambient cookies, so classic browser CSRF does not
  apply to it. This must be re-analysed the moment any cookie-authenticated
  browser surface (admin console, web app) is added.
- **SSRF:** any server-side fetch driven by client input must validate scheme and
  destination against an allow-list.
- Request validation on every endpoint (schema + bounds), response minimisation
  (never return fields the caller does not need), and error responses that never
  expose stack traces, SQL, internal hostnames or secrets.

## 7. File uploads (berry photos and video — expect hostile input)

Accepted policy (owner decision, 2026-10-08):

- **Allow-list only**: JPEG, PNG and HEIC images; MP4 and MOV video. Anything else
  is rejected, including on re-upload of previously accepted media.
- **Type verified from bytes**, never from the declared content type, the filename
  or its extension. The three checks are independent and all must agree with the
  allow-list.
- **Size ceilings**: 25 MB per image, 200 MB per video, enforced before the bytes
  are stored and again server-side (a client-side check is a UX affordance only).
- **Server-generated storage names**; the client filename is never used for storage
  or for display without escaping.
- **Metadata stripped**: EXIF (including GPS) and embedded thumbnails are removed on
  ingest, and client metadata is never trusted for position, time or authorship.
- **Bound dimensions/bitrate** to prevent decompression bombs and resource
  exhaustion, and never serve user content with an executable or hostile content
  type — store outside the web root, serve with a fixed safe content type.
- **Authorisation per upload**: the server verifies the caller owns the visit the
  evidence attaches to before accepting bytes.
- Content scanning is not required for v1 (no real money, private beta) but must be
  revisited if the operator-facing surface grows or media becomes public.

## 8. Notifications and webhooks

- Webhooks: verify signatures, protect against replay (timestamp/nonce), and make
  handlers idempotent.
- Push notifications (FCM): payloads are untrusted input; never make a security
  decision in the client because a payload said so. Server-side device-token
  ownership checks are required.

## 9. Credentials, secrets and storage

- No secrets in the repository: no tokens, keys, keystores or credentials in Git,
  in `.env.example`, in fixtures or in documentation.
- `EXPO_PUBLIC_*` values are inlined into the shipped bundle and are public by
  definition. Only `/src/config/env.ts` may read them, and it enforces
  https-only outside development and rejects URLs carrying credentials.
- Only public identifiers — never a server credential, private API key or signing
  material — may live in the client. Anything shipped in the app is observable by
  an attacker.
- The one third-party key in the bundle is **Firebase's Web API key**
  (`EXPO_PUBLIC_FIREBASE_API_KEY`), used only for the password-reset request (ADR-062). It
  identifies the Firebase project rather than authorising access, so it belongs in
  `EXPO_PUBLIC_*` — and it must be restricted by the project's API-key rules, because an
  unrestricted key is a quota and abuse problem even though it is not a secret. No service
  account, admin credential or private key ever reaches the client. The reset email's template
  and the page a new password is set on are Firebase's too; the app holds no token from either.
- Authentication tokens and personal data go into platform secure storage
  (iOS Keychain / Android Keystore) — never AsyncStorage, never plain files
  (ADR-006). Note that `expo-secure-store` and a secure-storage wrapper are **not
  installed yet**; they are required before the first auth or personal-data feature.
- The authentication seam (`src/services/session/`) currently persists **nothing**: its
  session lives in memory for the length of the process, behind a `SessionStore` port whose
  second implementation is ADR-006's secure store (ADR-028). That is why no credential is stored
  anywhere yet, and it is the reason the seam may exist before the adapter does — a session must
  never be moved into ordinary local storage “for now”, not even a stand-in one.
- What a session proves is **identity in this client's own understanding, never privilege**.
  The client is untrusted, the server decides what a caller may see and do, and nothing in the
  seam grants access to anything (ADR-013 §3, ADR-012).
- Outside a production build the **stand-in session port accepts any non-empty password and
  verifies nothing**; in a production build it accepts no credential at all and both account
  actions are drawn disabled (ADR-054 §8, ADR-059). The password is handed to the provider
  adapter's place and is never written to a store, a log or the session; the app's own database
  will hold no password or hash (ADR-054 decision 2).
- **Secret scanning runs in CI.** `gitleaks` 8.30.1 (pinned by version and SHA-256, so a moved
  release tag cannot change what runs) scans the full git history on the frontend workflow,
  with `.gitleaks.toml` extending the default rules and allowing only the app's versioned
  `picky.*` storage keys, which are public identifiers. A finding fails the job. The workflow
  is path-filtered to `app/**` and its config files, so a secret committed in `backend/`,
  `data/` or elsewhere is scanned only when a later frontend change starts it; a repo-wide
  secret workflow is the follow-up. Review remains the first control, and `.env` stays
  git-ignored.

## 10. GPS and privacy

Location is sensitive personal data:

- Collect the minimum needed for the feature, at the coarsest sufficient accuracy;
  stop collection when the feature does not need it.
- Server-side enforcement of privacy: the server decides what a caller may see,
  and never returns another user's exact track.
- Never assume a client-side privacy toggle is sufficient.
- Avoid exposing exact tracks in logs, analytics, error reports, crash dumps or
  screenshots; round or drop coordinates where the feature allows.
- Verify authorization before exposing any location-derived value.
- Data retention and access rules are unresolved and must be decided before GPS
  data is stored (PROJECT.md "Open questions").

## 11. Logging and observability

Never log or send to third parties: passwords, tokens, API keys, cookies,
authorization headers, precise GPS coordinates, media contents, or personal data.
Log what is needed to debug production (error codes, request ids, state
transitions) with a redaction helper that is applied by construction rather than
by remembering. Production builds must not ship verbose debug output or usable
source maps where that leaks implementation detail.

## 12. Client hardening

- Wrap third-party SDKs at the boundary and validate what they return.
- Remove debug configuration and test hooks from production builds.
- Set the network security configuration so that release builds reject clear-text
  traffic.
- Deep links and push payloads are untrusted input: validate route parameters
  before use.
- Android auto-backup is **off** (`android.allowBackup: false`). With it on — Expo's prebuild
  default, so the key has to be written — the OS would copy the app's private files, the
  `AsyncStorage` records included, into the user's cloud backup, although the copy on screen says
  they stay on this phone. `src/config/__tests__/app-hardening.test.ts` holds the setting.
- The `picky://` scheme is a deep-link surface: another app or a page can open any route.
  Onboarding is **not** an authentication boundary, and nothing the app stores today is
  protected by it; route-level gating has to arrive with the account service (ADR-028), not be
  assumed from the journey.

## 13. ML and AI boundaries

Models are not security boundaries. Outputs of local or remote models, client-side
model results, and user-supplied metadata are untrusted input that must be
validated and bounded before use. Document confidence and uncertainty where a
decision depends on a model. No model runs in this repository today.

## 14. Dependencies and supply chain

Before adding a dependency: check whether the project already has something
suitable, check Expo compatibility, maintenance status, security history, bundle
size and licence; avoid anything unnecessary. Prefer recommended Expo modules.
Review dependency vulnerabilities periodically (`npm audit`, `npx expo-doctor`)
and before releases. Never hand-edit generated native projects.

Development tooling is part of the supply chain: plugins, MCP servers and hooks run
with the developer's own privileges, so read what an install adds (its commands,
hooks and servers) before enabling it, and prefer official marketplaces. Content an
agent pulls from outside the repository — a Figma frame (ADR-016), a web page, a
package README — is untrusted input to evaluate, never an instruction to follow.

## 15. Production readiness checklist (before any release)

- [ ] Debug configuration and verbose errors disabled
- [ ] No secrets or private keys in the app bundle or repository
- [ ] Clear-text traffic rejected in release builds
- [ ] Dependency vulnerabilities reviewed and triaged
- [ ] Rate limiting active on auth/write/media endpoints
- [ ] Object-level authorisation tests in place for every resource
- [ ] Privacy/retention decision recorded for GPS and media
- [ ] Lawful basis and privacy notice published for every field collected
- [ ] Data-subject access, export and erasure exercised end to end, backups included
- [ ] Accessibility target met: WCAG 2.1 AA floor (EN 301 549), checked in both languages
- [ ] Logging redaction verified on a real build
- [ ] Error states verified for every networked screen

## 16. EU data protection (GDPR)

The app is offered in the EU, so data protection is a design constraint on every
feature, not a legal review at the end ([AGENTS.md](AGENTS.md) §11.1). This section
is the engineering checklist; the legal questions that need the owner's decision are
in PROJECT.md's open questions.

**Principles (Art. 5).** Lawfulness, fairness and transparency; purpose limitation;
data minimisation; accuracy; storage limitation; integrity and confidentiality;
accountability — the last one means: if it is not written down, it did not happen.

**For every new field or purpose:**

- [ ] The lawful basis is recorded (consent, contract, legal obligation, vital or
      public interest, legitimate interest) and the purpose is specific and stated.
- [ ] The collection is the minimum that makes the feature work, at the coarsest
      sufficient granularity (SECURITY.md §10 for position).
- [ ] Consent, where used, is **affirmative, granular, freely given, revocable and
      evidenced** — no pre-ticked box, no bundling, no dark pattern; withdrawing it is
      as easy as giving it, and the app must be able to act on the withdrawal.
- [ ] The data subject's rights are answerable: access and portability (a copy of
      what we hold), rectification, erasure (ADR-014: 12 months, and the backup path),
      restriction, objection, and no solely automated decision with legal effect.
- [ ] Processors are known and contracted (a DPA per processor, sub-processors
      included) and the storage region is an owner decision; transfers outside the
      EEA need a lawful transfer mechanism.
- [ ] A DPIA is screened for anything high-risk: systematic location monitoring,
      large-scale profiling, automated scoring, or special-category data.
- [ ] Retention is enforced in code or by a scheduled job — a written retention
      period with no mechanism is a finding, not a control.
- [ ] Records of processing (Art. 30) are updated when the data model changes.
- [ ] Children: the age policy is decided before accounts ship; no feature assumes
      adults-only without saying so.
- [ ] A personal-data breach has a documented path: detect, contain, assess, notify
      the authority within 72 hours where required, and inform users where the risk is
      high (Art. 33/34).
- [ ] Logging, analytics, crash reports and support tooling are checked against §11:
      no tokens, no coordinates, no personal data, no unnecessary identifiers.
- [ ] The privacy notice (screen 03's consent row links to it) matches what the code
      actually collects; when the code changes, the notice does too.

## 17. Current state

Implemented in this repository:

- Runtime configuration validation with https enforcement, credential-in-URL
  rejection and loopback-only clear-text exception for development, covered by
  tests (`src/config/env.ts`, `src/config/__tests__/env.test.ts`).
- `.env` git-ignored; only `.env.example` (with public placeholders) is committed.
- No secrets, credentials or private keys anywhere in the repository.
- Token-free, coordinate-free logging surface: the app logs nothing.
- Four fields the app holds, each answering §16's four questions in the module that owns it,
  and **none of them sent anywhere** (there is no transport at all):
  - the **visit tracking consent** (`picky.privacy-consent.v2`, `visitTracking` +
    `decidedAt`): readable by this app on this device; both controls that show it can correct it;
    withdrawing is as easy as giving it and is stored rather than a gap; `clearPrivacyConsent()`
    and uninstalling delete it, and a record left under the previous key is cleared on the next
    read rather than kept unreadable ([ADR-020](docs/adr/ADR-020-record-consent-on-device.md),
    [ADR-047](docs/adr/ADR-047-the-consent-says-what-the-app-does.md)). The consent states the
    purpose the app serves — tracking while the app is open — because the copy may not promise the
    background capture the app does not do.
    No coordinate, device identifier or account id, and an unreadable value reads as no consent,
    never as a yes.
  - the **report queue** (`picky.report-queue.v1`): the picker's own report, listed back on
    screens 11 and 13, deletable entry by entry or wholesale (`src/services/report-queue.ts`).
  - the **saved plan** (`picky.saved-zones.v1`): zone ids, the berry whose score layer each was
    saved under, and when they were saved — removable by the frame 07 bookmark or all at once,
    and listed on the `Saved spots` screen
    ([ADR-024](docs/adr/ADR-024-saved-zones-on-the-device.md), [ADR-030](docs/adr/ADR-030-the-saved-plan-gets-a-screen.md),
    [ADR-061](docs/adr/ADR-061-the-saved-zone-remembers-its-berry.md)).
  - the **session** — the account's identifier **and the name the sign-up collected**
    ([ADR-029](docs/adr/ADR-029-the-session-carries-the-accounts-name.md)) — held in process
    memory only, never written to storage, dropped by the first sign-out or the end of the
    process, and accepted from nothing in a production build (ADR-027, ADR-028).
- **Sign out deletes the three device-side records and drops the session**, in that order, so a
  deletion that fails leaves the user signed in with their data intact rather than signed out of
  an account the app did not manage to clear (`src/services/sign-out.ts`; the assumption is
  recorded as PROJECT.md known issue 29).
- **Android auto-backup is off** (`android.allowBackup: false`), so the records above are not
  copied off the device by the OS. `src/config/__tests__/app-hardening.test.ts` asserts that
  setting, the foreground-only permission list, and the absence of a blanket iOS cleartext
  exception.
- **Secret scanning** in the frontend workflow: `gitleaks` over the full history with
  `.gitleaks.toml` (§9), on every pull request and push that starts it.

The Discover map's **zone cache** (`picky.zones-cache.v1`) also lives on the device, and is not
one of the four records above: it holds the service's public zone geometry and scores — no
coordinate, identifier or input of the picker's — is replaced by the next read, restored only
while the map has been opened within the previous week, and removed when the app's data is
cleared or the app is uninstalled
(`src/features/discover/services/zone-cache.ts`).

**Dependency advisories (2026-10-25).** `npm audit --omit=dev` reports 5 high and 5 moderate
advisories, reached through Expo's CLI and build tooling (`@expo/cli`, `node-forge`, `zod`) and
through `tailwindcss`/`nativewind`/`postcss-selector-parser`. npm offers only major version
changes — including a downgrade to Expo 54, the wrong direction for this SDK 58 app — so they are
recorded here as a review item rather than patched silently; re-run the audit before a release
and decide each one.

Not implemented (blocking feature work):

- Authentication/authorisation, secure credential storage, API client, TLS
  pinning policy, privacy enforcement, file-upload validation, rate limiting,
  crash reporting.
- Route-level access control: the app shell gates nothing and a deep link can open any route.
  Onboarding is a journey, not an authentication boundary; gating has to arrive with the account
  service (ADR-028), not be bolted onto a journey later.
