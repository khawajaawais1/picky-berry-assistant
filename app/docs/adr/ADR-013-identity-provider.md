# ADR-013 — Firebase Authentication as the field-user identity provider

> **Superseded on 2026-10-23 by [ADR-054](ADR-054-the-account-belongs-to-the-api.md).** The
> account is now the team API's record and Firebase issues the credential; decisions 2–5 below
> (token verification, identity-never-privilege, no stored credentials) carry forward. The
> reasoning is kept as history.

- **Status:** Superseded by [ADR-054](ADR-054-the-account-belongs-to-the-api.md)
- **Date:** 2026-10-08
- **Deciders:** Project owner

## Context

Field users must authenticate, and the owner decided identity is delegated to a
managed provider so the team never stores credentials (PROJECT.md "Domain model
decisions" 11). Field users may not have a usable email address, so phone sign-in
matters. The backend is FastAPI (ADR-011) and must verify tokens without a shared
secret where possible. Mobile-first support and low cost dominate, because the team
is small and the product is unproven.

Options considered from the service catalog: Firebase Authentication (mobile-first,
email + phone + federation, MFA, free at this scale), Stytch (passwordless/SMS-first),
self-hosted Logto/Ory (own the data, own the operations), and Clerk (best developer
experience in the catalog, but its own install guidance is Next.js-specific — Expo
support unverified).

## Decision

1. **Firebase Authentication** is the identity provider for field users. Sign-in
   factors (email/password, phone, federated) are configured in the Firebase
   console; the app uses the Firebase client SDK.
2. The API verifies **Firebase ID tokens as JWTs** against Google's published keys:
   signature, issuer, audience (our project) and expiry. Cryptographic identity
   comes from the token; nothing else the client says about who it is is trusted.
3. **A valid token proves identity, never privilege.** Roles, ownership and
   eligibility are ours, stored and enforced server-side (SECURITY.md §3). No
   Firebase custom claim is treated as authorisation.
4. **No credentials are stored by us.** Password reset, lockout, MFA enrolment and
   session revocation are the provider's responsibility; our code contains no
   password handling.
5. Firebase client configuration (`apiKey`, `authDomain`, `projectId`) consists of
   public identifiers, not secrets, and may live in `EXPO_PUBLIC_*`. Firebase
   **admin/service credentials must never** enter the app bundle, the repository or
   the mobile configuration.
6. **Account deletion must work end to end**: deleting an account removes provider
   identity and our data according to ADR-014's retention rules.
7. Moderators do not authenticate in the field app at all (ADR-012); the operator
   surface chooses its own provider and MFA policy.

## Alternatives considered

1. **Our own email/password auth on FastAPI** — no vendor, but we would own hashing,
   reset, lockout, MFA and breach handling. Rejected: exactly the security work a
   small team should not hand-roll.
2. **Stytch** — excellent passwordless/SMS fit, but session verification for a
   custom backend is more integration work than verifying a standard JWT. Rejected.
3. **Self-hosted Logto/Ory** — full control of identity data, but the team operates
   and secures another service; disproportionate for this stage. Rejected.
4. **Clerk** — strongest developer experience in the catalog, but its own catalog
   guidance is Next.js-only, so Expo support would need verification before any
   commitment. Not chosen, and revisitable if Firebase proves limiting.

## Consequences

Positive: credentials, MFA, reset and revocation are specialist-managed; phone
sign-in covers users without email; ID tokens verify against public keys with no
shared secret; the free tier covers the expected scale; the client holds no secret.

Negative / accepted costs: Google lock-in for identity (migrating identities later
is a real project); SMS verification becomes billable past the free tier, which is a
per-user cost we do not control; the API must cache JWKS and handle key rotation;
"MFA for privileged accounts" (bootstrap §14) is now an operator-surface decision,
not solved here; the deletion path spans provider and our data and must be tested as
one flow.

## Open, blocking implementation

- Whether phone verification is required for every field user or only for
  reward-sensitive actions.
- MFA requirements for moderators — must be decided in the operator surface's own
  ADR before privileged access ships.
- Firebase project ownership, billing owner and the environments (dev/staging/prod)
  to create.

## Related

- ADR-011 (backend in repo), ADR-012 (privileged surface), ADR-014 (retention)
- SECURITY.md §5 (authentication), §9 (secrets), ARCHITECTURE.md §7
