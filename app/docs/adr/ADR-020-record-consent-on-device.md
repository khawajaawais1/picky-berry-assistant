# ADR-020 — Consent is recorded on the device, and withdrawn on the screen that promises it

- **Status:** Accepted
- **Date:** 2026-10-09
- **Deciders:** Project owner (the question was put to them; the answer below is the design's)

## Context

Screen 05 (frame node 5:22885) collects one thing: the user's consent to **background visit
tracking**. Its row's own sentence makes two promises — “I consent to background visit
tracking. I can turn it off in Privacy settings.” Until this decision the screen kept the
answer in `useState`: closing it lost the consent, and the second promise had nowhere to be
kept, because the privacy settings screen did not exist.

Three constraints shape what a consent record may be:

- **GDPR Art. 7** (AGENTS.md §11.1, SECURITY.md §16): consent must be affirmative, freely
  given, **revocable**, and the app must be able to act on the withdrawal; accountability
  means a consent the app cannot show is a consent it cannot rely on.
- **AGENTS.md §11.1**: every stored field must answer who may read it, how the user gets a
  copy, how it is corrected, and how it is deleted.
- **The backend does not exist** (ADR-015). Nothing may add a processor or a transfer outside
  the EEA on its own, and nothing captures position yet.

The design answers the product half of the question: frame 14 (node 5:23613) is the
account-and-privacy screen, and its withdrawal control is a **“Background visit tracking”
switch** — the same words the consent row uses — under a status message that repeats the
limitation (“GPS trails are never public. Visibility applies to spots, not your route. Exact
tracks are never shown to others.”). So the screen the consent sentence promises is a real
frame, and the control is a switch on it.

## Decision

1. **The consent is a record on the device**, not a screen's state and not a server field:
   `picky.privacy-consent.v1` in `@react-native-async-storage/async-storage`
   (`src/services/privacy-consent.ts`), holding `{ backgroundTracking, decidedAt }`. It is
   **sent nowhere**: no processor, no transfer, no network call. The non-sensitive storage
   is deliberate — this is a preference, not a credential, so ADR-006's secure storage is
   not the right home for it.
2. **The key is versioned** (`…v1`). A record whose shape changes gets a new key rather than
   being read as if it were the old shape, so a stored value the app does not recognise is
   the same state as never having decided.
3. **Reading is fail-closed.** Anything the app cannot understand — a truncated write, a
   hand-edited value, a shape from another version — reads as *no consent*, never as a yes.
   The one swallowed error is the `JSON.parse` of unreadable data, whose alternative would be
   a crash carrying nothing but a preference the app can simply ask for again.
4. **A consent is written only when the user decides.** There is no effect that records a
   default or a read. Screen 05 ships its row **unchecked** although the frame draws it
   ticked, and switching it on is the write.
5. **Withdrawal is the same write with the opposite value**, not a deletion, so the record
   says what is true now and `decidedAt` distinguishes “turned off” from “never asked”.
   `clearPrivacyConsent()` exists for the case where the record itself should go — signing
   out — and is tested for that purpose.
6. **The screens share one hook, not one copy each**: `usePrivacyConsent()`
   (`src/hooks/use-privacy-consent.ts`) reads the record on mount and exposes
   `{ consent, loading, error, record, clear }`. While the read is in flight the state is
   “no consent yet”, so nothing acts on a guess: screen 05 disables its action and the
   privacy screen disables its switch.
7. **A failed write is reported and the truth is re-read.** The hook re-reads the stored
   value on failure, so a control never shows a consent that does not exist; the consent
   screen blocks its action, and the privacy screen says “Your choice could not be saved.”
   That sentence is app-side copy: the design has no failure state, and a write that did not
   happen has to be said out loud (AGENTS.md §2.3).
8. **The privacy screen is the screen the consent sentence promises**
   (`src/features/privacy/components/privacy-settings-screen.tsx`, route
   `/privacy-settings`): the frame's header, its status message and its switch row — the part
   of frame 14 that can be true today. The frame's rows that lead to screens that do not
   exist are not rendered, because an affordance that cannot act must not claim a role.

## Alternatives considered

- **Keep it in the screen's state** (the state before this decision). Zero plumbing and no
  stored field, but the promise in the same sentence (“I can turn it off in Privacy
  settings”) becomes unimplementable, and the answer is gone the moment the screen is. It
  also makes the consent undemonstrable, which is exactly what Art. 7 accountability asks
  for.
- **Store it server-side, behind the account.** The only way to make the consent survive a
  reinstall and be provable to anyone but the device, and the natural home once the consent
  has to authorise a server-side process. Rejected *now*, not in principle: there is no
  backend (ADR-015), no lawful basis recorded yet (PROJECT.md open question 15), and adding a
  network call with a personal-data field would create a processor and a transfer on its own
  (AGENTS.md §11.1). It stays open as a question rather than being decided by accident.
- **`expo-secure-store`** (ADR-006's home for credentials). Wrong tool: this is not a secret,
  and the keychain is the wrong place for a preference the UI reads on every visit to two
  screens. Secret storage also behaves differently across platforms and reinstall cases,
  which would make “still consented?” depend on the device rather than on the user.
- **A timestamped *log* of every decision** rather than the current value. More auditable,
  but it accumulates personal data the feature does not need (AGENTS.md §11.1), and Art. 7
  needs the current state and the ability to withdraw, not a history.
- **Recording the OS permission alongside it.** Not yet meaningful: the app deliberately
  requests nothing from the operating system (PROJECT.md open question 21), so there is no
  permission state to store and no way to keep it honest until the request exists.
- **A `Switch` scaled to the frame's 46x28.** Rejected: it would distort a native control,
  its platform feel and its accessibility behaviour to match a vector drawing. The platform
  switch's own metrics are used, with the frame's colours.

## Consequences

- The four questions AGENTS.md §11.1 asks are answered for this field, in the service's own
  documentation: this app on this device may read it; the two controls show it, and there is
  no export because the field is a boolean and a timestamp; either control corrects it; and
  `clearPrivacyConsent()` plus uninstalling the app delete it.
- Withdrawal is as easy as consent: the same control that gave it, one screen away, with the
  same words — and the test suite asserts the withdrawal reaches the record, on both screens.
- The stored field is a **preference, not a trace**: no coordinate, no device identifier and
  no account id is written with it, so it adds nothing to the position-retention question
  (ADR-010, ADR-014).
- Adding the consent to a server later is a **new decision** — a lawful basis, a processor and
  a retention answer — not an extension of this one.
- The privacy screen exists before its frame's Profile screen does, so nothing links to it
  yet; it is reachable by its route, and the frame's other rows remain unbuilt
  (PROJECT.md, known issues 11).
- A future setting on this screen follows the same shape: a service for the stored value, a
  hook for the screens, and one write per user decision.
