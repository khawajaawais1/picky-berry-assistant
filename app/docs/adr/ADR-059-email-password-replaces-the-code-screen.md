# ADR-059 — Email + password replaces the code screen

- **Status:** Accepted (2026-10-24)
- **Date:** 2026-10-24
- **Deciders:** Project owner, on 2026-10-24, choosing the re-cut ADR-054 describes: one form on
  screen 03, screen 04 retired, and the app-drawn sign-in screen re-cut in the same pass.
- **Retires:** [ADR-027](ADR-027-a-stand-in-verification-code.md) (the stand-in code).
  Screen 04 and its `000000` credential are deleted with it.
- **Extends:** [ADR-054](ADR-054-the-account-belongs-to-the-api.md) (the credential and the
  account's owner), [ADR-028](ADR-028-an-authentication-seam-behind-a-port.md) (the port, whose
  shape is unchanged), and [ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md)
  (the sign-in screen, whose credential this re-cuts).
- **Amends:** [ADR-054](ADR-054-the-account-belongs-to-the-api.md) decision 8. ADR-054 kept the
  `000000` code beside the stand-in session port until the account service answers; with no code
  screen there is no question for that code to answer, so it goes now and the stand-in session
  port is the only stand-in left.
- **Supersedes in part:** [ADR-049](ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md)
  (screen 04's phone states) and the screen-04 half of
  [ADR-048](ADR-048-the-verification-copy-claims-no-delivery.md) (the copy of a screen that no
  longer exists). Both records stay as the history of the decisions they made.

## Context

ADR-054 decided the account's credential: the team's API owns the account, Firebase issues an
**email + password** credential, and our database holds no password, hash or reset token. It also
recorded the consequence: *“the design's code screen is re-cut. Frames 03/04 draw an identifier and
a code; the plan's credential is a password. The screen becomes an email + password form (with the
design's framing kept).”* Nothing had been built from that consequence — screen 04 still collected
six digits and the session port still accepted `000000`.

Frame 03 already draws a password field with its own rule (“At least 8 characters, with a number.”).
The design's actual departure is smaller than “no password field”: the frame offers **email or
phone** chips, and the credential the plan chose is an **address and a password**. Phone sign-in is
deferred (ADR-054 §5), so the phone chip would lead to a flow that does not exist.

The owner asked on 2026-10-24 to finish the re-cut: one form on 03, 04 retired, and the app-drawn
`/sign-in` screen — built from ADR-034's answer before the credential was chosen — moved to email +
password too.

## Decision

1. **Screen 03 is one email + password form.** It keeps the frame's composition: the back control
   and title, the heading and supporting line, the name, address and password fields, the password
   hint, the consent row with its terms link, the 54 px action, the sign-in action and the privacy
   note. The **email/phone chips are not drawn**: the address is the only identifier, because phone
   sign-in is deferred (ADR-054 §5). The password field is the frame's own, not an addition.
2. **Screen 04 and everything behind it are deleted, not disabled.** The route
   (`src/app/verify-email.tsx`), the screen, its domain rules, the resend countdown, the six-cell
   field, its two tokens, the `pending-verification` hand-off and the stand-in code `000000` all go.
   The frames stay the source for what screens look like, so screen 04's extraction and copy stay
   recorded in [design-source.md](../design-source.md); its row says retired and names no route.
3. **A successful screen 03 submission is account creation and sign-in at once.** The form's values
   go to the session port; when it accepts, the flow continues to screen 05 (location consent). A
   sign-up no longer has a verification step to walk. When the API exists, the same call will
   create the provider credential and `POST /auth/register` the account row — the port's shape is
   ADR-028's and does not change.
4. **The sign-in screen collects email + password.** It keeps its app-drawn framing (the key tile,
   the screen title and the way to screen 03), and gains the password field the credential needs,
   a masked value with a reveal control, and a failure line. A successful sign-in still lands in
   the app rather than on screen 05. It draws **no recovery action** in this decision: the design
   has no reset journey and the provider's reset path is not wired, so the app does not invent one
   (ADR-054's consequences; PROJECT.md known issue 23). **Amended 2026-10-24 by
   [ADR-062](ADR-062-password-reset-belongs-to-the-provider.md):** the owner asked for the journey,
   so the screen now draws “Forgot password?” and leads to the app-drawn request screen; the reset
   itself stays at the provider.
5. **The session port keeps its three operations and gains the password in its credential.** The
   `Credential` is `{ email, password, displayName? }`; the password is handed to the provider
   adapter and is not stored, logged or put in a session. The stand-in behind the port:
   - accepts any **non-empty** password outside a production build, because it cannot verify one
     and will not pretend to — the form's own rule is the gate, and the session it issues is worth
     nothing outside this repository;
   - accepts **nothing** in a production build (`unavailable`), and both screens draw their action
     disabled there;
   - refuses an empty address, an empty password or a blank name as the programming errors they
     are, rather than issuing a session about nothing.
6. **The failure line is the screen's, as screen 04's was.** The design has no error state (PROJECT.md
   open question 11 still owns the treatment), so a refused credential or a session the app could
   not keep leaves one `danger` sentence under the action rather than a silent press. Sign-up and
   sign-in each have their own line, in both languages.
7. **The prototype readings are not product screens and are not re-cut.** The three throwaway
   readings of a sign-in screen remain review paper for ADR-034's open drawing question; the
   code reading now says on its own note that it proposes a step this ADR retired. They are absent
   from a production build.
8. **The register call's locale and consent are still owed.** The form's consent gates the press
   today; no server receives the consent or the device's language until `POST /auth/register`
   exists (ADR-054 decision 3). That is recorded rather than silently dropped, and the API work
   inherits it.

## Alternatives considered

1. **Keep screen 04 as an empty confirmation step.** A screen whose action does nothing is exactly
   what AGENTS.md §11.2 forbids, and it would claim a verification that never happened. Rejected.
2. **Put the password on screen 04 instead.** That leaves screen 03 collecting an identifier and a
   name, then a second screen asking for the secret the frame already draws on 03 — a longer flow
   with no security gain. Rejected.
3. **Code + password (two factors).** Not the plan's v1, adds a delivery channel and a second
   failure path the app has none of, and ADR-054 explicitly chose password at the provider.
   Rejected for v1.
4. **A stand-in that accepts one known password.** Closer to ADR-027's shape, but a password is
   chosen by the user at sign-up, so a single accepted value would either refuse the account the
   user just typed or force the screen to ignore what it collected. The stand-in therefore checks
   nothing, says so here and in the code, and is gone when the provider arrives. Rejected as
   misleading rather than safer.

## Consequences

- **The walk through onboarding is shorter.** A development build goes 01 → 03 → 05 → the app with
  no code to type. The browser harness, the accessibility walks and the production export were
  updated with the screens; the production export now checks that both account actions are
  disabled rather than that a code is refused.
- **The stand-in is even more clearly a stand-in.** Any non-empty password opens a session outside
  production. That is acceptable only because no production build accepts one, and the README,
  PROJECT.md and `stand-in-port.ts` say it in the same words.
- **A “verified” label is now unearned by construction.** Frame 14's account row still reads
  “Email verified”, drawn from the session's identifier. Before this ADR the stand-in code at
  least walked a verification step; now nothing does, and the claim waits for the provider's email
  verification or a product decision to drop the word (PROJECT.md known issue 27).
- **Password reset now exists in part.** **Amended 2026-10-24:** the request half of password reset now exists
  ([ADR-062](ADR-062-password-reset-belongs-to-the-provider.md)) — the action, the app-drawn
  request screen and the stand-in's honest confirmation — while the email and the new-password
  page remain the provider's and a production build cannot request a link.
- **A removed screen leaves removable code behind, and it was removed.** The public API, the
  control ledger, the demo-screen classification, the translation catalogue, the layout harness,
  the accessibility tree walk, the copy-claim ledger and the design token set all lost their
  screen-04 entries in the same change, so nothing keeps a route or a token for a screen that is
  not there.
- **Screen 04's design is still the record.** Its measurements and copy remain in
  [design-source.md](../design-source.md), because a future phone or verification journey may
  need them; no route renders them.

## Related

- [ADR-054](ADR-054-the-account-belongs-to-the-api.md) (the credential, the account and the
  re-cut this records), ADR-027 (retired stand-in code), ADR-028 (the port), ADR-034 (the sign-in
  screen), ADR-048 and ADR-049 (screen 04's copy and phone states, superseded in part),
  ADR-038 (a session may carry no name), ADR-006 (secure storage, still owed)
- PROJECT.md known issues 23, 24 (closed by this ADR), 25 and 27; open questions 11, 12 (resolved
  by ADR-054) and 20 (retired with the screen)
- `docs/design-source.md` (screens 03 and 04), `docs/demo-and-stand-ins.md` (stand-in rows G1 and
  B1), `SECURITY.md` (what is stored)
