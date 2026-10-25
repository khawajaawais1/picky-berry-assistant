# ADR-041 — A session that can run out says so while it is running out

- **Status:** Accepted (2026-10-11)
- **Deciders:** the project owner asked for the remaining screens (2026-10-11); this repository wrote
  the reading, its wording and its tests.
- **Related:** [ADR-028](ADR-028-an-authentication-seam-behind-a-port.md) (the port and its stand-in
  lifetime), [ADR-029](ADR-029-the-session-carries-the-accounts-name.md) and
  [ADR-038](ADR-038-a-session-may-carry-no-name.md) (what a session carries),
  [ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md) (the sign-in screen this
  offers the way back to), [ADR-039](ADR-039-frame-14s-two-remaining-rows-get-their-screens.md) (the
  account surface that states the session's facts), and
  [ADR-013](ADR-013-identity-provider.md) (whose token length the hour comes from).

## Context

The session seam (ADR-028) issues a session good for `SESSION_LIFETIME_MS` — **one hour**, chosen
because that is the length the decided provider's own ID token uses (ADR-013), not as a product
preference — and `sessionPort.current()` **drops a session that is past its time** and reports
nobody. That rule is pure, tested and injectable (`src/services/session/session.ts`: `isExpired`,
`remainingMilliseconds`), and known issue 25 recorded exactly what was missing: “no session expiry a
user can meet”.

The consequence was a screen that could be silently wrong. Frame 14's account surface (ADR-039)
states the session's facts — where it is kept, that it lasts an hour, what ends it — and *an hour
being stated is a claim that becomes untrue while the screen is open*. A user reading it at minute 59
would see a screen asserting an hour that had already run out; the next screen they opened would show
a signed-out app with no account of how that happened, because the only place expiry existed was
inside the port.

There is also nothing to refresh against. Whether a session is extended by a provider's refresh token
or by this project's own backend session is open question 12, and a silent extension would make the
stated hour a lie in the other direction (the screen would name an hour and enforce a different one).

## Decision

**The account surface observes the session's own expiry and states it, and offers the way back in
when it has passed.**

1. **The moment is read by a shared hook, and the rule stays in the domain.** `useNow()`
   (`src/hooks/use-now.ts`) re-reads the clock once a second while the screen is mounted — the
   granularity a reading in minutes needs to cross its own boundary, and the same tick frame 09's
   visit timer already uses — and it decides nothing about sessions. The screen asks the session's own
   pure functions (`isExpired`, `remainingMilliseconds`) about that moment, so expiry has one
   implementation and the tests use it rather than a React component's arithmetic.
2. **While there is a live session, the screen shows the time left**: whole minutes, **floored** so
   the reading never claims more time than there is, and separately worded under the last minute
   rather than rounded up to “1 minute”. The reading is drawn only for a session that is still
   good — there is nothing to count down for one that has ended.
3. **When the hour is up, the session is not drawn as if it were live.** The account row disappears,
   the countdown disappears, and a warning notice says the session has ended — the design's own
   notice treatment, the one the notice screen uses for a record it cannot read. The screen says what
   happened *where the user already is*, instead of leaving the next screen to tell them.
4. **The way back in is offered exactly when there is nothing to carry on with** — the hour ran out,
   or the app holds no session at all and none is expected — and it leads to `/sign-in` (ADR-034),
   outside the app shell, like frame 01's own link. Its label is the destination's own title. With no
   handler, or while a read is still in flight, nothing is drawn: a control that cannot act claims no
   role (AGENTS.md §11.2).
5. **Nothing is extended, refreshed or re-issued.** There is no provider to refresh against (open
   question 12), so a session that has ended is one the user signs into again, and the screen says so
   rather than holding a control it cannot honour. This is the explicit alternative to a silent
   refresh.
6. **A session is not invented for a signed-out user.** No session and no error is a state the screen
   names in its own line; a read that failed stays reported as a failed read, never as “nobody is
   signed in” (the rule `useSession` already follows).

## Alternatives considered

- **Say only the lifetime, and let the next screen be the discovery.** The status quo, and it left the
  app unable to explain the one thing a user would notice: being signed out. It also put the app's
  account surface in the position of asserting something false for up to an hour.
- **Refresh the session silently.** What a real provider eventually may do — and not this app's to
  decide: a session that renews itself would falsify the hour the same screen states, and the refresh
  path is the provider's ID/refresh pair or our own backend session (open question 12).
- **Hand the user to the sign-in screen the moment the hour passes.** It would move them somewhere
  they did not ask to go and take away the explanation: the screen they are on is the one that can say
  why. The screenshot they keep is the notice plus a way in.
- **A countdown of minutes and seconds.** More motion than the fact deserves, and a re-render per
  second for a number that changes once a minute. The under-a-minute line carries the last stretch
  without pretending to precision the session does not have.
- **A push notification when the session ends.** The app delivers no notifications and asks for no
  permission; nothing may be built on one existing (frame 12's alert preferences are unbuilt for the
  same reason).
- **Only clear the session at the next `current()` read.** Unchanged from before: it is what made the
  expiry invisible.

## Consequences

- Known issue 25's “no session expiry a user can meet” is closed for the surface that holds a session:
  an expired session is now a state the user is told about, with a way forward, on the screen that
  stated the hour.
- The session's rules stay pure and reused: the screen holds no arithmetic of its own, and the hour it
  displays remains the port's `SESSION_LIFETIME_MS` (a test keeps the screen's stated lifetime and the
  constant in step).
- The screen re-renders once a second while it is open and stops when it is unmounted; the account row
  and the ended notice are mutually exclusive by construction, so no state can show an account the app
  no longer holds.
- What is still the owner's: how long a session lasts, what refreshes it, whether it survives a reload
  and what else signs a user out (open question 25, ADR-034 §3.1–§3.2). This decision says only what
  the app does at the end of the hour it currently has.
- Costs: one shared hook and one dependency of the account screen on the clock; the reading's Finnish
  wording joins the rest of the catalogue in open question 13's review.

## References

- `src/hooks/use-now.ts`, `src/hooks/__tests__/use-now.test.ts`;
  `src/features/privacy/components/account-security-screen.tsx` and its test; `src/app/(app)/account-security.tsx`.
- `src/services/session/session.ts` (`SESSION_LIFETIME_MS`, `isExpired`, `remainingMilliseconds`) and
  `src/hooks/use-session.ts`.
- PROJECT.md known issue 25, open question 25; the catalogue keys under `privacy.accountSecurity.session.remaining.*`.
