# ADR-056 — Background capture is out of scope for v1

- **Status:** Accepted (2026-10-23) — the background “no” stands; the foreground budget §2.3 named
  is decided separately by [ADR-063](ADR-063-the-watch-has-a-cadence-and-an-accuracy-budget.md)
  (2026-10-24).
- **Date:** 2026-10-23
- **Deciders:** Project owner, on 2026-10-23, answering
  [ADR-047](ADR-047-the-consent-says-what-the-app-does.md) §2 after eleven days pending.
- **Supersedes:** ADR-047 **§2 only** (its six slots). §1 — the copy and the stored field — stands
  unchanged and is what this ADR builds on.
- **Relates to:** [ADR-045](ADR-045-a-position-behind-a-port-and-nothing-kept.md) (the foreground
  port and the guard), [ADR-046](ADR-046-the-tracker-gets-its-hook-and-the-zone-list-stays-out.md)
  (the tracker), [ADR-055](ADR-055-retention-and-processors.md) (the basis and the windows §2.4–2.5
  asked for), [ADR-051](ADR-051-the-team-mvp-plan-becomes-the-apps-target.md) (the plan's visit
  state machine).

## Context

Frame 05's consent row promises visit tracking “even with the screen locked”, and frame 14's switch
repeats it. The app has never done that. Since 2026-10-12 it says so: the copy on five strings
states **visit tracking while the app is open**, the stored field is `visitTracking`, and a guard
fails the build if a background switch appears in `app.json` (ADR-045, ADR-047 §1).

That left one question to the owner: should the app ever capture in the background? ADR-047 §2
wrote it as six slots — whether, which permissions, what cadence, what lawful basis, what may be
kept, and where it is asked — and left every one `> _pending_`. It has waited since 12 October,
through the demo plan and the zone service work.

Three facts decide it. **Nothing can be captured yet**: the tracker takes its zone list as an
argument and the service does not exist (PROJECT.md known issue 14), so a background task would
watch for zones the app cannot name. **The cost is not a permission toggle**: iOS “Always”, the
location background mode, Android `ACCESS_BACKGROUND_LOCATION` and a foreground service with its own
notification, each with a store declaration and, in the EU, a justification reviewers read.
**And the promise is already withdrawn from the copy**, so saying no costs the product nothing it
currently tells anyone it does.

## Decision

1. **No background capture in v1.** The app asks for the platform's “while the app is open”
   permission and nothing else: no iOS “Always” usage string, no location background mode, no
   Android background-location permission, no foreground service, no background task. `app.json`
   keeps only `locationWhenInUsePermission`, and
   [`src/config/__tests__/location-permissions.test.ts`](../../src/config/__tests__/location-permissions.test.ts)
   stays exactly as the enforcement — it is the test that makes this decision true a year from now.
2. **§2.1 is answered “no”.** §2.2 (permissions and declarations) **closes unanswered because it no
   longer has a question**: nothing background is asked. §2.3's foreground half — how often and how
   precisely the open-app watch reads — is decided separately by ADR-063: high accuracy, a fix at
   most once a minute and only after 50 m of movement.
3. **§2.4 and §2.5 are answered by [ADR-055](ADR-055-retention-and-processors.md)**: tracking's
   lawful basis is consent, separate from the terms and withdrawable on its own; the
   position-derived record is a visit, its presence segments and one coarse centroid, kept twelve
   months, and **no raw sample is ever kept** (ADR-010).
4. **§2.6 closes.** No questionnaire is sent for this; the owner has answered, and the four
   documents' reconciliation is unchanged.
5. **The frames' background promise stays removed — as a departure for v1, not a stand-in.** The
   consent row, the benefit above it, frame 14's switch, the notice's row and screen 09's arrival
   note keep the open-app wording (ADR-047 §1). They are no longer waiting on a permission
   decision; they state the product. The departure is recorded in `docs/design-source.md` and
   PROJECT.md as permanent for v1.
6. **The plan's background task is deferred, not dropped.** The team plan's visit state machine
   mentions one; under this ADR it is post-MVP, and revisiting it means **a new ADR that supersedes
   this one**, not an edit here. ADR-047 §2's slots are the checklist for that ADR, with ADR-055's
   windows already answered.
7. **Foreground detection is unaffected.** The tracker still runs while a screen is open, through
   the same port and the same pure rules (dwell, grace, presence segments, ADR-045/046); a picker
   who locks the screen stops accruing dwell time, and screen 09's note already says so. Nothing
   about the foreground path changes.
8. **What a future “yes” would need**, recorded now so it is not rediscovered: a second consent
   purpose and its copy in both languages, the usage strings and store declarations, a foreground
   service notification on Android, a cadence/accuracy and battery budget, a background-task test
   on a device, the store justifications, and confirmation that ADR-055's region and basis still
   cover it. Not one of those is built or scheduled.

## Alternatives considered

1. **Build it — both platforms — before the demo.** Matches the frames and the plan's wording, and
   gives a picker a visit logged while their phone is pocketed, which is the product's best story.
   Rejected for v1: it spends two store declarations and a permission on a tracker with no zone
   list, and the demo cannot show it honestly while the zone service is unbuilt.
2. **Android only, for the demo.** Half the declarations, and Android's foreground service is
   demonstrable. Rejected: it makes the copy platform-dependent (“while the app is open — except
   Android”), and the app's consent would then mean two different things on two phones.
3. **Keep §2 pending and revisit after the demo.** What the last eleven days did. Rejected: a
   pending decision kept the copy's honesty hostage and left ticket F5 waiting on an answer that
   nothing was going to force.
4. **Ship it behind a flag, off in production.** Rejected: a permission in the build is a promise
   to the store and the user regardless of a flag, and the guard test exists precisely to stop
   that.
5. **Drop the frame's promise from the design too.** Tempting, since the app no longer makes it —
   but the design is the designer's, and the departure is recorded rather than the frame being
   edited by this repository (ADR-016).

## Consequences

- **The app's copy, its permissions and its build guard now agree**, and stay agreeing by test.
- **A picker who walks with the screen locked logs nothing.** That is the product cost, stated
  plainly: it is why this is “out of scope for v1” rather than “no forever”, and why the revisit is
  scheduled after the demo rather than filed as a permanent no.
- **The 17 Dec demo loses no demonstrable feature**, because there was none to lose: the tracker
  had no caller and no zone list.
- **The plan's background task moves to post-MVP**, and the ticket that carried it (F5) becomes a
  foreground ticket — wire the tracker to a screen and a real zone list, which is what the demo can
  show.
- **ADR-047's status changes**: its §1 stands, its §2 is superseded here, so it reads “Accepted in
  part — §1 decided and built; §2 answered by ADR-056”.

## Related

- ADR-045 (the port and the guard), ADR-046 (the tracker's hook), ADR-047 (superseded in §2),
  ADR-010 and ADR-055 (what may be kept), ADR-051 (the plan), ADR-016 (the design source)
- PROJECT.md open question 21 (resolved), `docs/design-source.md` (screen 05's departures)
