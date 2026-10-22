# ADR-050 — Screen 05's continue action says what the press does

- **Status:** Accepted (2026-10-13)
- **Deciders:** the project owner, who asked for known issue 33 to be decided rather than left open —
  “decide whether screen 05's continue action opens a settings surface or says what the press
  actually does, and hold the answer in both languages”. The label is the **design's** own
  (frame `5:22885`), which is why this record also marks the departure from it.
- **Date:** 2026-10-13
- **Related:** [ADR-045](ADR-045-a-position-behind-a-port-and-nothing-kept.md) (the position port:
  the platform's permission is asked in the app, in the foreground, when a screen reads a fix),
  [ADR-047](ADR-047-the-consent-says-what-the-app-does.md) (the consent copy that says what the app
  does), [ADR-048](ADR-048-the-verification-copy-claims-no-delivery.md) (the same treatment for seven
  strings that claimed a delivery) and [ADR-049](ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md)
  (the sibling departure from a frame's own words), [docs/control-claims-audit.md](../control-claims-audit.md)
  family 8 (which indexed this label) and [docs/copy-claims-audit.md](../copy-claims-audit.md) (whose
  scan now holds the claim), [docs/design-source.md](../design-source.md) §“Screen 05, as extracted”,
  PROJECT.md known issue 33 (closed here) and open question 15 (the lawful basis, which is the reason
  the screen asks nothing of the operating system).

## Context

Frame 05 (node `5:22885`) draws two ways off the screen: a primary action reading “Continue to
location settings” / “Jatka sijaintiasetuksiin”, and a way past it without tracking. In the app, the
press **records the consent the row carries** — on the device, versioned, written only on a decision
(ADR-020/047) — and opens the app's map, which is exactly where the skip action goes. The two differ
in what was recorded and in nothing else.

No location-settings screen exists, in the design or in the app. The platform's own permission is
asked **in** the app, by the position seam, the first time a screen reads a fix, and only in the
foreground (ADR-045); nothing anywhere sends the reader to the operating system's settings. So the
label named a step the app never takes — on the one screen whose whole subject is what the app does
with a position, and on the control a reader is most likely to press.

The control-claims audit of 2026-10-12 found it (family 8) and recorded it as **known issue 33**
rather than rewriting it, for a reason that was right at the time: the label is the frame's own words,
and whether the app opens a settings surface or says what the press does is a call no implementation
should make on its own. That call has now been made.

Two facts made the answer cheap. ADR-047 §1 had already rewritten every other string on this screen
to state what the app does — the consent row, the timing benefit and the reassurance line all say
“while the app is open” — so the action's label was the last sentence on the screen still naming a
step that does not happen. And the destination is already drawn on the screen: the frame's own
zone-map preview is what the press opens.

## Decision

**The action says what the press does, and no settings surface is built for it to open.**

1. **The label follows the press.** `onboarding.location.action` becomes **“Continue to the map”** /
   **“Jatka kartalle”**. The press records the choice and opens the app's own map screen — the
   illustration this screen draws above the action — so the label names what the reader is about to
   see. It is shorter than the frame's own label in both languages, so the frame's 54 px action still
   holds one line at both text sizes.
2. **No location-settings surface is built.** A screen the design never drew, reachable only because
   a label named it, would be the same defect one level up: the consent is recorded on the device and
   the platform's permission is asked in the app (ADR-045), so the screen would have nothing to send
   the reader to — and it would have to stay honest about asking nothing, because the lawful basis for
   position is still open (PROJECT.md question 15).
3. **The frame's own words are kept as the branch that earns them.** If a journey ever really does
   lead to a platform settings surface — the realistic case is a refusal the operating system will not
   re-ask, which is a decision nobody has taken yet — then “Continue to location settings” /
   “Jatka sijaintiasetuksiin” is that journey's label, in both languages, and
   [docs/control-claims-audit.md](../control-claims-audit.md) family 8 is where the condition is
   recorded. The words are the design's and are not lost: they are the drawn state the design source
   already carries.
4. **Nothing else on the screen changes.** Both actions still land in the same place — that was never
   the defect, the label was. The consent row, its copy and its unchecked default, the two benefit
   rows, the reassurance line, the skip action and the screen's refusal to ask the operating system
   for anything all stay as they are.

## Alternatives considered

- **Keep the frame's words and record the reason.** Rejected: this is not a sentence about the
  design's intent but the *label on the only control the screen offers*. Every other string on the
  screen had already been made to say what the app does (ADR-047); leaving this one would keep the
  screen's most-read line false, which is precisely the defect family 8 recorded.
- **Build the settings surface the label names.** Rejected: the design draws no such screen, the app
  opens none, and a surface that exists to make a label true — one whose only content would be that
  the app asks nothing and that the permission arrives later — is a claim dressed as a screen.
- **“Continue” / “Jatka” alone.** Rejected: it says nothing about where a once-seen press leads, which
  is what the frame's own shape (“Continue to …”) is for. “The map” is both true and shorter than the
  label the frame draws.
- **Send the reader to the operating system's settings for real.** Rejected, and not as a wording
  question: it would ask the platform for a permission whose lawful basis the owner has not decided
  (ADR-045, question 15), which is the one thing this screen deliberately does not do.

## Consequences

- **One key's value changes, in both languages**, and nothing else in the app moves:
  `onboarding.location.action`. The catalogues carry the reason beside the key, and the screen's unit
  test states the rule — the label names where the press leads, not a settings step
  (`location-consent-screen.test.tsx`).
- **It is measured like any other string**: screen 05's copy stays in the layout harness's list in both
  languages at both text sizes, and the built walk in `e2e/accessibility.spec.ts` presses the action by
  its **new accessible name** and lands on `/discover`.
- **The claim cannot come back quietly.** The control audit's family 8 goes from *recorded — open* to
  *fixed*, and the vocabulary of a settings step joins the copy scan as a family of its own —
  `a-settings-step-the-app-never-takes`, **empty and asserted empty**, with the defect as it shipped
  among its planted originals in both languages. A reverted string, a fresh translation or a
  neighbouring screen that names “location settings” fails the gate rather than shipping. The app's own
  **Privacy settings** surface is deliberately outside that vocabulary: the claim is the *step out of
  the app*, not the word “settings”.
- **Known issue 33 is closed**, and the design source records a fourth departure on screen 05 — with
  the frame's own label kept there as the drawn state, not deleted.
- **What this does not decide:** where the platform's permission is asked, and on what lawful basis
  (ADR-045, ADR-047 §2, PROJECT.md questions 14 and 15), and which screen a phone identifier walks
  (open question 20). This record closes a label, not either of those.

## Related

- [ADR-045](ADR-045-a-position-behind-a-port-and-nothing-kept.md) — the seam that asks the platform, in
  the app, which is why there is no settings step to name
- [ADR-047](ADR-047-the-consent-says-what-the-app-does.md) — the copy on this screen that already says
  what the app does, and §2's pending background decision
- [ADR-048](ADR-048-the-verification-copy-claims-no-delivery.md) and
  [ADR-049](ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) — the same treatment for
  a frame's words that claim what the app does not do, and the branch wording each records
- [docs/control-claims-audit.md](../control-claims-audit.md) — family 8, the label claim, and what the
  audit's pass did and did not fix
- [docs/copy-claims-audit.md](../copy-claims-audit.md) — the index the new family joins
- [docs/design-source.md](../design-source.md) — screen 05 as extracted, and the departures it records
- PROJECT.md — known issue 33 (closed), open questions 14, 15 and 20
