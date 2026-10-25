# ADR-054 — The account belongs to the team's API; Firebase issues the credential

- **Status:** Accepted (2026-10-23)
- **Date:** 2026-10-23
- **Deciders:** Project owner, answering open question 28 on 2026-10-23: the API owns accounts,
  Firebase issues the credentials.
- **Supersedes:** [ADR-013](ADR-013-identity-provider.md) (the identity provider). ADR-013's
  decisions 2–5 are carried forward unchanged in substance; what changes is **whose record the
  account is**.
- **Narrows:** [ADR-027](ADR-027-a-stand-in-verification-code.md) and
  [ADR-028](ADR-028-an-authentication-seam-behind-a-port.md) — both stand-ins stay until the
  account service answers, and both go when it does. **Amended (2026-10-24):** the `000000` code
  stand-in is retired early by [ADR-059](ADR-059-email-password-replaces-the-code-screen.md), because
  the code screen it served is gone; the stand-in session port is the one stand-in left.
- **Extends:** [ADR-032](ADR-032-the-first-backend-slice.md). Its “accounts are
  identity-provider subjects and nothing else” still holds for the share slice; the v1 account
  record below adds a locale and consent timestamps, not a name and address of its own.

## Context

Two decisions have been true at once since the team's plan arrived. The plan has the app register
and sign in against the team's FastAPI with **email + password** (`POST /auth/register`,
`/auth/login`), collecting the language and a consent on register. This repository decided
**Firebase Authentication** and, since then, has held **no password** at all: screens 03 and 04
collect an identifier and a code, behind a stand-in port
([ADR-028](ADR-028-an-authentication-seam-behind-a-port.md)), and the API has no account row
([ADR-032](ADR-032-the-first-backend-slice.md)).

Both cannot be the answer (PROJECT.md open question 28, which recorded it as *asked, not assumed*).
The owner answered on 2026-10-23: the **API owns the account, Firebase issues the credential**.

That answer is not a compromise between the two documents so much as the reading that keeps each
document's reason. The plan needs an account the server can name — a locale, a consent record, a
deletion path, a row analytics can count — because its register screen collects those. ADR-013
needed the team never to store a password, because hashing, reset, lockout, MFA and breach handling
are the work a small team should not hand-roll. An account owned by our API with a credential issued
by Firebase satisfies both: the password never reaches our database, and the account is ours.

## Decision

1. **The account is the team API's record.** One row per account in the API's PostgreSQL, keyed by
   the provider's subject (`sub`) and unique on it, carrying the account's locale (the language the
   register screen collects), its consent timestamps, and the name the session already carries
   ([ADR-029](ADR-029-the-session-carries-the-accounts-name.md),
   [ADR-038](ADR-038-a-session-may-carry-no-name.md)). No address, no date of birth, no password.
2. **Firebase Authentication issues and verifies the credential** — email + password for v1, with
   reset, lockout, MFA enrolment and revocation in the provider. Our code stores **no password, no
   password hash and no reset token**; ADR-013 decisions 2–5 stand: ID tokens verify against
   Google's published keys (signature, issuer, audience, expiry), `sub` is the only identity claim,
   a valid token proves identity and never privilege, and the client holds public configuration
   only.
3. **The API exposes no password endpoint.** If the plan's contract keeps the name
   `POST /auth/login`, it is a **token exchange** — `{ idToken }` in, the account and session facts
   out — and never a password field. `POST /auth/register` takes `{ idToken, locale, consent }`,
   creates the account **idempotently on `sub`**, and returns the same account on a retry. `GET /me`
   reads it back.
4. **Registration is recoverable across the two systems.** A credential created at Firebase whose
   `POST /auth/register` never arrived (offline, closed app) is completed on the next sign-in
   rather than duplicated: the API treats a valid token with no row as a registration waiting to
   finish. This is the failure mode the split creates, and it is the one to test.
5. **Phone sign-in is deferred, not dropped.** v1's factor is email + password. The phone branch
   stays where [ADR-049](ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) left
   it — assumed answers, no shipped promise — and turning it on needs its own answer, because a
   number is a second credential and a second verification cost.
6. **The client**: screens 03 and 04 take the email and the password and hand the password to the
   Firebase SDK, never to our API. The session port keeps its shape (`signIn`, `current`,
   `signOut`, ADR-028) and gains a real adapter: Firebase for the credential and its refresh,
   the API for the account. Tokens live in platform secure storage
   ([ADR-006](ADR-006-secure-credential-storage.md)); nothing is written to ordinary storage.
7. **Deletion spans both systems, in one order**: revoke the provider credential, delete the
   account's server data, delete the account row — retried by the API when the provider is
   unreachable, and reported to the user only when both halves are gone
   ([ADR-055](ADR-055-retention-and-processors.md) decision 7).
8. **The stand-ins keep their dates.** The `000000` code (ADR-027) and the stand-in session port
   (ADR-028) remain until the account service answers, and are **deleted, not disabled**, when it
   does. Nothing in this ADR is built until `POST /auth/register` exists.

## Alternatives considered

1. **The plan literally: FastAPI stores passwords.** No vendor, one system, and the register
   screen maps one-to-one. Rejected: we would own hashing, reset, lockout, MFA and breach handling,
   which ADR-013 rejected for good reason, and the demo has no time to build them well.
2. **Firebase only, no account row.** The app gains a password with no new server data, and
   ADR-032's “subjects and nothing else” stays true. Rejected: the plan's register screen collects a
   language and a consent that must live somewhere the server can read, the deletion and export
   paths need a row to name, and “which accounts exist” would otherwise be answerable only by the
   provider.
3. **Passwordless only (email link or SMS).** Closest to the code screen the design draws and to
   ADR-013's phone story, with no password to store anywhere. Rejected for v1: the owner chose
   email + password, and the plan's testers expect one; revisitable without changing the account
   record.
4. **Phone-first sign-in.** Rejected for v1: SMS is billable, the demo's testers have email, and
   ADR-049's phones screens are still assumed answers.

## Consequences

- **One account, two systems.** The failure the split creates is a credential without an account
  row; decision 4 makes it recoverable rather than a duplicate, and the registration test must
  cover it.
- **The design's code screen is re-cut.** Frames 03/04 draw an identifier and a code; the plan's
  credential is a password. The screen becomes an email + password form (with the design's framing
  kept), and that is a **recorded departure** for the design owner — the design has no password
  field, and no copy for reset. It is a departure, not a redraw: the frames stay the source for
  what the screen looks like.
- **Password reset is a journey the app drew in part on 2026-10-24.** The owner asked for it, and
  [ADR-062](ADR-062-password-reset-belongs-to-the-provider.md) records the split: the app draws the
  request and the confirmation, the provider sends the email and hosts the new-password page, and
  the app handles no token. Until an adapter is wired, a production build cannot request a link and
  a development build says no email was sent.
- **A smaller breach surface, a real lock-in.** Our database cannot leak a password because it
  holds none; migrating identities out of Firebase later remains a project (ADR-013's cost, kept).
- **Processor and region consequences** are recorded in [ADR-055](ADR-055-retention-and-processors.md):
  Firebase stays a processor, in the EU, under a DPA.
- **Offline sign-in still does not exist.** The refresh token lets a signed-in app keep its
  session; a signed-out app with no network cannot sign in, and says so.

## Related

- [ADR-006](ADR-006-secure-credential-storage.md) (secure storage), ADR-013 (superseded),
  ADR-027 and ADR-028 (the stand-ins), ADR-029 and ADR-038 (the name the session carries),
  ADR-032 (accounts as subjects), ADR-049 (the phone branch), ADR-055 (retention, processors)
- PROJECT.md open question 28 (resolved), `CONTEXT.md` *Credential*, `docs/plans/team-mvp-plan.md`
