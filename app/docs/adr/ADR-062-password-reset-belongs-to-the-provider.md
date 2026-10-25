# ADR-062 — Password reset asks the provider, and the app keeps no token

- **Status:** Accepted (2026-10-24)
- **Date:** 2026-10-24
- **Implementation amendment (2026-10-24):** Firebase is now wired behind
  `SessionPort.requestPasswordReset` through its Identity Toolkit `accounts:sendOobCode` method.
  `EXPO_PUBLIC_FIREBASE_API_KEY` turns it on; an empty key keeps the test-build path. Decision 8's
  “production still cannot reset” therefore holds only in a build without a key — with one, a
  shipped build sends the email and draws the live confirmation decision 5 recorded. Decisions 3,
  4 and 7 are unchanged: the app still stores no address, token or new password.
- **Deciders:** Project owner, on 2026-10-24, asking for the reset journey ADR-059 records as
  missing to be designed and built “keeping the design's framing and recording any departure”.
- **Answers:** [ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md) §1.5 — the
  recovery path that slot kept open.
- **Extends:** [ADR-028](ADR-028-an-authentication-seam-behind-a-port.md) (the port and its
  stand-in) and [ADR-048](ADR-048-the-verification-copy-claims-no-delivery.md) (no shipped string
  claims a delivery the app does not make), applying both to password reset.
- **Amends in part:** [ADR-059](ADR-059-email-password-replaces-the-code-screen.md) decision 4 —
  the sign-in screen now draws the recovery action that decision withheld because no reset journey
  existed; the rest of ADR-059 stands. [ADR-028](ADR-028-an-authentication-seam-behind-a-port.md)'s
  “three operations” also grows by one; the three session operations themselves are unchanged.
- **Implements:** the provider side [ADR-054](ADR-054-the-account-belongs-to-the-api.md) recorded:
  the provider owns the reset, the email and the new password, and our code stores no password,
  hash or reset token.

## Context

ADR-054 put the credential at Firebase, with reset, lockout and MFA in the provider. Its
consequences recorded the gap plainly: *“Password reset is a journey the app does not draw yet.
Resilience copy, the reset email and the post-reset landing need their own screens; until then the
app names the provider's reset path rather than inventing one.”* ADR-059 then retired screen 04,
which made password reset the only missing part of the credential story, and its decision 4 kept
the sign-in screen free of a recovery action for exactly that reason. ADR-034 §1.5 — “is there a
recovery path in v1?” — was still `_pending_`, so the screen had no answer to build from.

The design file has no reset frame either. Frames 01 and 03 draw “Already have an account? Sign in”
and stop there; the sign-in screen itself is app-drawn from ADR-034's answers. A reset screen
therefore cannot be a frame's extraction. It can keep the framing the app already draws around
sign-in, which is what this record does.

What exists today: the app-drawn sign-in screen at `/sign-in`, the session port with a stand-in
provider behind it, an in-memory session store, and copy rules (ADR-048) that forbid claiming a
message the app does not send. What does not exist: a Firebase project, a client SDK, an email
transport, a reset token handler, or any screen that asks for an address to reset.

## Decision

1. **The journey is provider-delegated, and the app draws only its request half.** `/sign-in` gains
   a **“Forgot password?”** action. It opens `/forgot-password`, an app-drawn screen that asks for
   the email the account uses and requests the provider's reset link. The provider sends the email
   and hosts the page where a new password is set. The app draws **no new-password screen**, accepts
   **no reset token** and handles **no reset deep link**; after the provider's page the way on is
   `/sign-in`, which the confirmation and the screen both offer. This answers ADR-034 §1.5 and
   amends ADR-059 decision 4.
2. **The framing is the sign-in screen's, because there is no frame to keep.** The screen carries
   the same 76 px key tile, the onboarding header with a back control, the design's 54 px field and
   action, and a text action back to sign-in. Its copy is the app's, in Finnish and English, like
   the sign-in screen's. It is frame-less, so the layout harness holds it to “nothing is lost at
   200 %” rather than to a frame's line counts.
3. **The port gains one operation, not a second seam.** `SessionPort.requestPasswordReset(email)`
   returns `{ ok: true }` when the provider accepted the address, or
   `{ ok: false, reason: 'refused' | 'unavailable' }`. It does not create, change or read a session,
   and it stores nothing: no address, no token, no link, no new password. The reset belongs to the
   same provider and the same future adapter as sign-in, so it lives behind the same port
   (extending ADR-028). A separate service would be a second place the provider has to be wired.
4. **The stand-in sends nothing, and says so.** Outside a production build it accepts any non-empty
   address and returns `ok`, so the screen's next step can be walked; in a production build it
   returns `unavailable`, and the screen draws its action disabled. It has no provider to ask and
   no mailbox to reach, so the confirmation carries a **test-build note**: no sign-in service is
   connected, no reset email is sent, and the link would go to this address in the finished app.
   The note is drawn only outside production, where the confirmation is reachable at all. This is
   the same honesty ADR-048 required of the retired code screen and ADR-059 required of the
   stand-in credential.
5. **No string claims a delivery, and the request is not an account oracle.** The action says
   “Request reset link”, not “Send me a link”; the confirmation says the request was **accepted**
   and that *if* an account uses the address, the provider's reset link is the next step. Every
   address gets the same outcome and the same words, so the screen cannot reveal which addresses
   have accounts. One `danger` line covers a refusal or a request that could not finish; it does
   not distinguish an unknown account from a provider failure. When the provider is connected, the
   confirmation's body becomes “Check your inbox” and the test-build note goes —
   one wording change per language, recorded here rather than guessed now — the branch ADR-048
   records, where the words that claim a delivery are restored the day something delivers.
6. **The failure line is the screen's, not a new design state.** The design has no reset frame and
   no error state, so a refusal or a rejected request leaves one sentence under the action rather
   than a silent press (AGENTS.md §2.3). It is the same treatment sign-in and screen 03 already
   use, in both languages.
7. **The request does not widen what the app holds.** The address is the only value the screen
   collects, and it is handed to the port and not written to the session store, the report queue,
   a log or a URL. The provider remains the processor ADR-055 records; no new processor, transfer
   or field is created. A reset token never enters the app, so ADR-006's secure-storage rule is not
   exercised by this journey.
8. **Production still cannot reset, and says so by being disabled.** No sign-in service exists in a
   shipped build, so the request action is disabled exactly as sign-in and account creation are
   (ADR-054 §8). The screen remains readable; the test-build note is not drawn there because the
   confirmation cannot be reached. When an adapter lands, the action becomes live and the note
   disappears.

## Alternatives considered

1. **An app-owned journey: email, token, new-password screen.** The app would collect a token from
   a deep link and post a new password. Rejected: ADR-054 puts reset and the token at the provider,
   and our code must store no reset token; a client-side new-password screen would either hold the
   one credential value the architecture forbids or fake the change. It also needs a design frame
   and copy the file does not contain.
2. **Keep the recovery action absent.** That was ADR-059's state, and the owner asked for the
   journey to be built. Rejected as the request's opposite, not as a bad design.
3. **A screen that only names the provider's path, with no action.** The control could open a
   support page or display a URL. With no provider configuration there is no URL to open, so the
   action would be inert — a control that cannot act, which AGENTS.md §11.2 forbids. Rejected.
4. **A stand-in that pretends to send, with “Check your inbox” and no note.** The screen would claim
   the one thing ADR-048 exists to stop: a message the app does not send. Rejected, and the test
   note is the answer instead.
5. **A separate password-reset service or port.** It would keep the session port at “three
   operations”, but split the provider across two seams that must be wired together. Rejected: one
   provider, one adapter, one port; the fourth operation is recorded here.
6. **A new-password form drawn locally without a token.** It would collect a password and discard
   it, or store it — both worse than no screen. Rejected.

## Consequences

- **The credential story is complete on the app's side.** `/sign-in`, screen 03 and the reset
  request are the three surfaces of one email + password account; the reset's provider adapter is
  now wired, while sign-in and account creation still wait for the account service.
- **A development build can walk the journey, and is told what it is walking.** Without a
  Firebase key the request succeeds in the stand-in, the confirmation appears, and the note says no
  email was sent; a production build without one cannot request a link and draws the action
  disabled. With a key, the build sends the real email in every environment and the test note is
  not drawn.
- **The real adapter has one place, and it is there.**
  `services/session/firebase-password-reset.ts` calls Firebase's `accounts:sendOobCode` behind
  `SessionPort.requestPasswordReset`; the screen and its copy are unchanged except for the live
  confirmation the provider earns. The adapter uses the REST method rather than installing the
  Firebase SDK, because the request needs one public key and keeps no client state. The reset
  email's template and the page where a new password is set remain the Firebase project's.
- **No reset token, link or new password is handled by the app**, and no new personal data is
  stored. The address in flight is the same one sign-in already carries; it is not retained.
- **The screen cannot be used to enumerate accounts.** The same acceptance, words and next step are
  drawn for every address; the one failure line is about the request, not the account.
- **The docs and ledgers move with it:** ADR-034 §1.5 is answered, ADR-059 decision 4 and ADR-028's
  operation count are amended, PROJECT.md known issue 23 loses its recovery half, the design
  inventory gains an app-drawn section, and the control, layout, accessibility and copy ledgers gain
  the screen. The layout harness measures the request state; the confirmation is held by the
  screen's unit test and the browser journey, which presses through and reads it.
- **Still owed:** the Firebase project's configuration — a Web API key set as
  `EXPO_PUBLIC_FIREBASE_API_KEY`, the password-reset email template, the page a new password is
  set on, and email-enumeration protection. Without the key the journey remains a walkable request
  with an honest note; with it, the app sends the request and Firebase owns the rest.

## Related

- [ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md) §1.5 (the answered slot),
  [ADR-054](ADR-054-the-account-belongs-to-the-api.md) (the provider and the missing journey),
  [ADR-059](ADR-059-email-password-replaces-the-code-screen.md) (the credential and the withheld
  action), [ADR-028](ADR-028-an-authentication-seam-behind-a-port.md) (the port and stand-in),
  [ADR-048](ADR-048-the-verification-copy-claims-no-delivery.md) (the copy rule),
  [ADR-006](ADR-006-secure-credential-storage.md) (why no token is kept),
  [ADR-055](ADR-055-retention-and-processors.md) (the provider is already a processor)
- PROJECT.md known issue 23, open questions 11 and 13, the decision list
- `docs/design-source.md` (the app-drawn screen), `docs/demo-and-stand-ins.md` (the stand-in's
  confirmation note and the provider's gate),
  `src/services/session/stand-in-port.ts` (the seam),
  `src/services/session/firebase-password-reset.ts` (the adapter)
