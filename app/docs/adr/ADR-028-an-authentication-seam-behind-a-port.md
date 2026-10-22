# ADR-028 — One session port, with a stand-in provider behind it

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Project owner (chose the seam's shape: an in-memory stand-in with the storage port declared, and the existing stand-in code `000000` as the credential it accepts)

## Context

The app has no way for a user to be signed in. Its flow runs forward only — frame 03 creates an
account, frame 04 asks for a code, frame 05 asks about location — and then every screen in the
shell behaves as if someone is behind it. Nothing establishes a session, nothing holds one, and
nothing can end one, so three things cannot be built or tested at all: **the sign-in screen**
(known issue 23, with no design frame and no service), **session expiry**, and any screen that
needs to know *who* is looking at it — frame 14's save/share rows, the account surface, the queue
that will be per-account when the API exists.

The blocker is a decision that is still open: ADR-013 decides Firebase Authentication, and
PROJECT.md's open question 12 is still open on whether the app talks to Firebase directly or
through our own backend. ADR-013 also decides that **our code handles no password** — the
provider verifies credentials — so there is nothing for the app to write that would be a real
check even if it wanted to.

Meanwhile ADR-006 (credentials in platform secure storage, "to be implemented with the first
authentication work") is accepted and unimplemented: `expo-secure-store` is not installed, and
secure storage does not exist on web, which is where the designer reviews the app and where the
layout harness measures every screen (ADR-018, ADR-019).

What the app needs now is not an identity provider. It is the **seam** where one will go, so the
screens and rules on this side of it can be written against a shape that does not change when the
answer to open question 12 does.

## Decision

1. **One session port, in `src/services/session/`.** `SessionPort` has three operations —
   `signIn(credential)`, `current()` and `signOut()` — because they are the three things the app
   does with a session: acquire one, ask for the one it holds, drop it. `src/app/verify-email.tsx`
   is its first caller; the sign-in screen, the shell's session check and the profile's sign-out
   row are written against the same three calls.
2. **The port is a service, not a feature.** It is cross-cutting infrastructure that onboarding,
   the shell and the profile all need, and it is not a vertical slice of the product's domain:
   `src/services/` is the home for cross-cutting adapters (ARCHITECTURE.md §2), and features may
   import it while it may not import a feature.
3. **A refusal is a value, not an exception.** `signIn` resolves to
   `{ ok: true; session } | { ok: false; reason: 'refused' | 'unavailable' }`, so a screen has to
   decide what to say about a credential that was not accepted. The two things that *do* reject
   are the two a caller cannot do anything about: a credential naming no account at all
   (a programming error) and a store that would not keep the session — a session the app does not
   have must never be reported as one.
4. **The stand-in provider is behind the port, and it is not a check.** It accepts exactly the
   stand-in code ADR-027 already established (`000000`), refuses every other credential, and
   refuses **everything** in a production build (`unavailable`) — including the stand-in code.
   It talks to no server, and it issues a session that is worth exactly as much as that code,
   which is to say nothing outside this repository.
5. **The stand-in code's rule moves to the seam.** `STUB_CODE` and `verifyCode` were
   screen 04's, in `features/onboarding/domain/`. “Is this the code we sent?” is the **account
   service's** question that two callers now ask — the screen (so a wrong code is refused on the
   spot) and the provider (so only a credential that passed can produce a session). One rule with
   two callers belongs where both can import it without a feature importing a feature; a second
   copy would be a second answer to the same question, and the two would drift. ADR-027's
   decision is unchanged; its implementation moved (see that ADR's amendment).
6. **Sessions live in memory, and the port says where that will change.** `SessionStore` is a
   port with one implementation today (`createInMemorySessionStore`); ADR-006's secure-storage
   adapter is the second, and the only place that has to change when a real token exists. Nothing
   is written to AsyncStorage, a file, a log or a URL, so **no credential is persisted at all**
   yet — which is why this is not a way around ADR-006 but the reason ADR-006 can stay
   unimplemented for now. The cost is stated rather than hidden: a session does not survive a
   reload, so no screen can be tested against a cold start.
7. **Expiry is a rule, not a screen's arithmetic.** `isExpired(session, at)` and
   `remainingMilliseconds(session, at)` take the moment they are asked about, the port takes an
   injectable clock, and `current()` answers `null` for an expired session while **dropping** it
   from the store — the same rule as sign-out, because a credential the app may no longer use is
   not one it may keep.
8. **Screen 04 hands the code up instead of judging it.** `OnboardingVerificationScreen` takes
   `onSubmitCode(code): Promise<boolean>` and no longer imports the rule: the route wires it to
   the port. A component does not authorise (ARCHITECTURE.md §3.2), and the answer has to come
   from behind the service port.
9. **One stand-in lifetime, marked as a stand-in.** `SESSION_LIFETIME_MS` is one hour — the
   length the decided provider's own ID token uses, so a screen built against it is not built
   against a fiction. The real answer is the provider's and is open (PROJECT.md, question 25).

## Alternatives considered

1. **Wait for the Firebase decision.** The screens that need a session could not be built, the
   expiry rule could not be written, and the answer to open question 12 would arrive as a
   rewrite of whatever had grown in the meantime.
2. **A `nothing | Session | Expired` union returned from every screen's own read.** Every caller
   re-implements expiry, and two callers disagree about the boundary instant. Rejected: the rule
   is one answer, and it belongs in one place.
3. **A feature `session` (`src/features/session/`).** Features are vertical slices of the
   product's domain; a session is app-wide infrastructure that several features import. Putting
   it in one feature would make every other feature depend on that feature's public API for
   something none of them own.
4. **Persist the stand-in session in AsyncStorage "for now".** ADR-006 forbids credentials in
   ordinary local storage, and a stand-in token is still a claim about who the user is. Rejected
   outright: the one thing a stand-in must not do is teach the codebase a habit the real
   provider has to unlearn.
5. **Install `expo-secure-store` now and write through it.** It implements ADR-006 properly, and
   it was the owner's second choice: it needs a development build (Expo Go cannot load the
   module), it does not exist on web, and the web export is how the app is reviewed and measured.
   Deferred until a real token exists to protect — which is when ADR-006 says it must land.
6. **A mocked HTTP account service** (a fake server answering `/sign-in`). It would pretend to be
   the thing that is undecided: open question 12 is precisely whether the app talks to Firebase
   directly or through our own API, and a fake of one of those answers is a decision made by
   accident.
7. **A boolean `ok` for the whole outcome.** Loses the difference between “this credential is
   not accepted” and “nothing here can accept one”, which are the two states a production build
   and a wrong code actually are.

## Consequences

- The sign-in screen, expiry and any signed-in-only screen can be built and tested now, against
  a port that survives the provider decision: when Firebase lands, the **implementation** is
  replaced and the callers are not.
- The stand-in cannot be mistaken for a check: one code, refused in production, no server, no
  persistence, and a lifetime copied from the provider's own token.
- `sessionPort` is a module-level instance with a process-length life. That is the in-memory
  store's meaning, and it is the one place a future secure-store adapter has to read from.
- Screen 04 lost its local rule and gained a callback; its single failure line now covers a
  refused code and a session the app could not keep. That is one failure state for two causes,
  knowingly: the design draws no error treatment at all and open question 11 has not answered
  what a screen must distinguish. The port keeps the distinction for the screens that come next.
- The seam holds **personal data** from the moment a credential names an account: the address or
  number the session is about, in memory, sent nowhere. The four questions AGENTS.md §11 asks are
  answered in `src/services/session/index.ts`; the **lawful basis** is the owner's and still open
  (question 15), as it is for the other device-side records (ADR-020, ADR-024).
- It is **not** an authorisation layer, and must not grow into one: a session says who the user
  is, the client is untrusted, and every privileged decision stays server-side (SECURITY.md §3–4,
  ADR-012).
- What it costs: one more indirection between a screen and a credential, an in-memory session
  that a reload loses, and a stand-in lifetime that has to be revisited with the real one.

## Related

- ADR-027 (the stand-in verification code, whose rule this seam now owns), ADR-006 (where a real
  token will live), ADR-013 (the provider and what a token proves), ADR-020 and ADR-024 (the
  other device-side records and the four questions they answer)
- PROJECT.md known issue 25 (what the seam does not do yet) and open question 25 (session
  lifetime and where the session is kept)
- SECURITY.md §9, ARCHITECTURE.md §3.5, TESTING.md §12
