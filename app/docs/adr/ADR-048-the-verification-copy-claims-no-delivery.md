# ADR-048 — The verification copy claims no delivery

- **Status:** Accepted (2026-10-12), **superseded in part (2026-10-24)** — screen 04 and its copy
  retired with [ADR-059](ADR-059-email-password-replaces-the-code-screen.md), so §2–§4's screen-04
  strings are no longer shipped; what remains of this record is the sign-in and account-surface
  wording, which still holds. **Amended in part** by
  [ADR-049](ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) §3.1 (2026-10-13): the
  half of §3 below that keeps the screen title for both identifiers no longer holds — the frame's
  title is drawn only when the destination is an address, and a number gets
  `onboarding.verification.titlePhone`. §3's other half (the expiry note) and the rest of this record
  stand; the string ADR-048 kept is untouched and still measures.
- **Deciders:** the project owner asked for the copy to stop claiming a code was sent, “keeping the
  wording honest for each branch of the account-service decision” (2026-10-12). This repository
  decided the wording, and which of the frame's own words come back when a service answers.
- **Related:** [ADR-027](ADR-027-a-stand-in-verification-code.md) (the stand-in code the flow runs
  on), [ADR-028](ADR-028-an-authentication-seam-behind-a-port.md) (the session port), [ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md)
  (the sign-in journey and the screen the design never drew), [ADR-039](ADR-039-frame-14s-two-remaining-rows-get-their-screens.md)
  (the account surface), [ADR-047](ADR-047-the-consent-says-what-the-app-does.md) (the same treatment
  for the consent's background half, whose §2 decision this one waits on), PROJECT.md known issue 32
  (this record), beside 24 (the stand-in) and 27 (“Email verified”), [docs/copy-claims-audit.md](../copy-claims-audit.md)
  row 3, and [docs/demo-and-stand-ins.md](../demo-and-stand-ins.md) §7.

## Context

The app contradicted itself on the first screens a picker reads. Screen 04 said “Check your inbox.”
and “Enter the 6-digit code **we sent** to {destination}”, its phone note said the code arrives “by
SMS”, the sign-in screen said “**We send** six digits to your email or phone” with an action reading
“Send me a code”, and the account surface repeated the claim (the reach line, and the device notice's
account record, “the address or number the code **went to**”). Nothing in the app sends anything:
there is no transport — no email, no SMS — the flow runs on the stand-in code ADR-027 installed, and
the app's own notice says “the app sends nothing anywhere”. A picker reads the promise on one screen
and the denial two screens later, with no way to tell which one to believe.

The audit of 2026-10-12 found the family and recorded it as known issue 32; that pass deliberately
left the wording alone, because which account service answers (PROJECT.md open question 12) decides
whether a code would go by email, by SMS, or by nothing a build without a service can claim. **This
record answers the half that does not need that answer**: what the copy may say while no service
exists, and what each branch turns it back into.

## Decision

**No shipped string claims a delivery the app does not make. The copy says what the step is for and
names the destination the code belongs to, and the frame's own words are recorded as the branch that
earns them.**

1. **The rule, in one line:** the sentence names the destination the code is *for* rather than the
   place a message *went*, and it says what the step does rather than what the app did. Nothing in
   the flow claims a send, an inbox, or a code on its way, in either language.

2. **The seven strings, and what each branch turns them back into.** “Today” is what ships while no
   account service exists; the other two columns are the wording the day one does, and with which
   carrier — the sentence differs, the flow does not.

   | Key | Today | With an email transport | With SMS |
   | --- | ----- | ----------------------- | -------- |
   | `onboarding.verification.heading` | “Confirm it’s you.” / “Vahvista, että olet sinä.” | the frame's “Check your inbox.” / “Katso postilaatikkosi.” | “Check your phone.” |
   | `onboarding.verification.supporting` | “Enter the 6-digit code for {destination}.” / “Syötä 6-numeroinen koodi {destination} varten.” | the frame's “…the code we sent to {destination}…” / “…{destination} lähettämämme…” | “…the code we texted to {destination}…” |
   | `onboarding.verification.phoneNote.body` | “The same six-digit step confirms a phone number.” / “Sama kuusinumeroinen vaihe vahvistaa puhelinnumeron.” | the frame's “a code sent by SMS” | the same, since the note is about the other journey |
   | `onboarding.signIn.supporting` | “One identifier, then six digits. No password to remember — and none to leak.” | “…the six digits we send…” | the same, naming the number |
   | `onboarding.signIn.action` | “Continue with a code.” / “Jatka koodilla.” | “Send me a code.” / “Lähetä minulle koodi.” (the screen's own words, restored) | the same |
   | `privacy.accountSecurity.reach.body` | “Signing in asks for a six-digit code **for** your email or phone…” | “…a code **sent to** your email or phone…” | the same, naming the number |
   | `privacy.termsPrivacy.record.account.value` | “…and the address or number **you entered**.” / “…jonka syötit.” | “…the code was sent to.” | the same |

3. **The frame's expiry note and screen title stay as they are.** “The code expires in 10 minutes.
   Don’t share it with anyone.” is the rule of the code the user is entering, not a claim about how
   it arrived, and “Verify your email” names the journey's subject. Neither is made false by the
   absence of a service, and neither is made true by one: they are the frame's, and they measure.

4. **The resend row is absent until a caller can send a code.** Asking for another code *is* the
   row's whole meaning, and a control that cannot act claims no role (AGENTS.md §11.2). The screen
   draws the frame's two states — the action, and the mid-wait “Resend code · available in 00:28”
   the frame itself catches — **only when a caller supplies `onResend`**; with none, neither the row
   nor the cooldown that paces it exists (the wait is what a send starts). The app's own route
   supplies none, so screen 04 ships without the row, and it comes back whole — action, wait and
   wording — the day a transport does. Recorded in [docs/demo-and-stand-ins.md](../demo-and-stand-ins.md)
   §7, and removed from the layout harness's measured copy for screen 04.

5. **The scan's family is cleared, and its vocabulary widened.** `src/config/__tests__/copy-claims.test.ts`
   now asserts that **no** string in either catalogue claims a message the app sent, and its pattern
   covers the words the first version missed — “We send”, “Send me a code”, “the code went to”,
   “Check your inbox”, “lähetämme”, “lähetä minulle”, “koodi lähetettiin” — which is three of the
   seven above plus the two headings. Its planted-original test covers this family as well as the
   background one, so a reverted sentence in either language fails the gate.

6. **What this does not fix, deliberately.** Three things beside the wording:
   - **Known issue 24** — a picker in a development build still has no code to type and the screen
     still cannot say which one works. Saying it is a *disclosure* decision about the stand-in (a
     build-time statement about a credential), not a wording one, and ADR-027 keeps the refusal in a
     production build.
   - **Known issue 27** — “Email verified” / “Phone verified” on the account row. Nothing verified
     the account; that is the verification that happened (or did not), and it waits on the service.
   - **Open question 20** — the phone state of screen 04. This record decides that the SMS branch
     names the carrier rather than the inbox; *which* screen a phone sign-up sees is still the
     owner's.

## Alternatives considered

- **Keep the frame's words and record the claim as the design's sample**, the way the demo rows on
  frames 07, 09 and 13 are disclosed and kept. Rejected: a demo sample is disclosed **on its own
  screen**, and here the app's own notice says two screens later that nothing is sent. A claim the
  product contradicts is not a sample; it is a self-contradiction.
- **Fix screen 04 only, which is the literal ask.** Rejected: the same claim is in seven strings
  across three surfaces, and a scan asserted to find no member of the family while the sign-in
  screen still says “We send six digits” would be a guard that lies about what it covers.
- **Choose the wording now for each branch** (email, SMS, or nothing) instead of writing what is
  true today. Rejected: open question 12 has no answer, and a sentence invented today is a third
  claim rather than a correction. §2 is the smallest recording that makes the future edit a wording
  change rather than a decision.
- **Say in the copy that no code is sent and which stand-in code works.** Rejected here: that is
  known issue 24's disclosure, decided with the build (it tells a reader what a credential is worth)
  rather than with the sentence, and it is not what a picker-facing screen should say about a
  deliberately temporary seam.
- **Neutralise the strings until production is possible** (“Confirm your account”, “Enter the code”)
  so no branch has to change. Rejected: the frame names the destination for a reason — the picker
  must see which address or number the account is under, which is the one fact here no other line
  carries.
- **Draw the resend row as a reading** (the frame's label, no role), as the offline screen's two
  actions are. Rejected for this one: those actions sit on a screen that discloses the sample above
  them, and there is no sentence here to carry that disclosure; a row reading “Resend code” is the
  claim itself, not a label for something else.

## Consequences

- **Seven strings changed in both catalogues**, three surfaces (screen 04, the sign-in screen, the
  account surface with the device notice's record), and the claims guard's second family is now
  empty and asserted empty, with thirteen planted originals covering both cleared families.
- **The app stops contradicting itself** on the two screens a picker reads first, and the promise no
  longer depends on which service answers.
- **The day an account service exists, the copy change is one edit per string per language**, and §2
  says which words: the frame's own sentences come back on the branch that earns them, and nothing
  else in the flow changes.
- **Screen 04 ships without the frame's resend row**, and with it the countdown the frame draws
  mid-wait. That is a visible departure from frame 04's composition — recorded here and in
  `docs/demo-and-stand-ins.md` §7 — and it is one prop away from returning.
- **Still true after this record:** no transport and no account service, so nothing sends, nothing
  verifies, and the flow runs on the stand-in; known issues 24 and 27 stand, and open question 20 is
  still open.
