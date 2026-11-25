# ADR-071 — A cold start keeps the session the device holds

- **Status:** Accepted (2026-11-25)
- **Deciders:** Project owner, reporting that closing and reopening the app signed them out and
  showed onboarding again.
- **Supersedes:** nothing. **Amends:** ADR-006's "cleared on a refresh failure" clause, read as
  *cleared on a refresh the server refuses*; ADR-028 and ADR-065 remain the port and the provider.
- **Extends:** ADR-006 (secure storage survives the process), ADR-028 (the session seam), ADR-041
  (a session that runs out says so on the account surface).

## Context

The session port kept the token pair in platform secure storage (ADR-006), but nothing read it on
launch: the root route always drew screen 01, so a picker who had signed in was offered onboarding
again after every process restart. The secure store held the answer; the app never asked.

Two behaviours made the missing read look like a sign-out even once it existed:

- `current()` refreshed a stale access token before answering, and a refresh that could not reach
  the server rejected. `useSession` reports that as "could not find out", and the app had no
  screen-level rule for what to do with an unknown session.
- ADR-006's summary said tokens are "cleared on … refresh failure", which reads as covering both a
  refusal and a network failure. Only the first is a decision by the server; the second is the
  phone being offline.

The web export keeps the session in memory for the tab's lifetime, so it cannot demonstrate a cold
start; a device can. That is where the defect was reported.

## Decision

1. **The root route reads the session before it claims anything.** `SessionRestore` paints a themed
   empty frame while `useSession()` is in flight. A held session redirects to `/discover`; no
   session draws the welcome screen; an unreadable store falls through to the welcome screen,
   because signing in again is recoverable while a blank launch is not. The welcome screen itself
   still knows nothing about sessions.
2. **Offline is not a sign-out.** When a refresh cannot reach the server, `current()` answers the
   session the store already holds and keeps the pair. Only a refresh the server refuses clears
   the store, as ADR-006 decided. The access token may be stale while offline, so API reads can
   fail until connectivity returns; the app's existing "could not find out" states already cover
   those reads.
3. **The gate is the entry route only.** A deep link to a `(app)` route still renders without a
   session, and `signOut()` still ends the session without navigating; the caller decides where to
   go. Guarding every route is a larger change (a provider above the stack, plus the onboarding
   flow's own exceptions) and remains the recorded gap in PROJECT.md known issue 25.

## Alternatives considered

- **Guard every `(app)` route.** The complete answer, but it needs a session provider above the
  stack and an explicit exception list for the welcome, sign-in, reset and consent routes. Deferred
  rather than half-built; the reported defect is the cold start, and this ADR fixes that.
- **Persist a separate "signed in" flag.** It would duplicate the token store and could disagree
  with it (a cleared store with a surviving flag is worse than the bug).
- **Draw onboarding, then redirect once the store answers.** This flashes a sign-in page at a
  signed-in picker, which is the defect in a different costume.
- **Clear the session whenever a refresh fails, including offline.** It would keep the old rule's
  simple reading, at the cost of signing a picker out in a forest with no signal.

## Consequences

- A device that holds a session opens Discover after a restart; a device that does not opens the
  welcome screen.
- The web export pre-renders the empty frame at `/`, so its first paint is themed and neutral
  rather than onboarding. The accessibility walk waits for the route's first control instead of
  sampling the frame immediately.
- `current()` can answer a session whose access token has expired. Screens that read the API will
  fail until a refresh succeeds, which is the offline behaviour they already had.
- A refresh the server refuses still clears the store, so a revoked or reused token cannot keep a
  picker signed in.
- The full route guard remains owed and is recorded, not silently assumed.
