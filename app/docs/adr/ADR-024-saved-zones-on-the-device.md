# ADR-024 — The picker's saved zones are a record on the device, written by the frame's own bookmark

- **Status:** Accepted (the plan's own surface, left open below, is ADR-030)
- **Date:** 2026-10-10
- **Deciders:** Project owner (asked to finish the frames' remaining parts; the shape below is this repository's)

## Context

Screen 07 (frame node `5:23032`) draws a **54 px bookmark tile** beside its “Navigate · 1.4 km”
action (node `5:23081`, named “Save zone”). The control was deliberately left out while the
screen was built, because it writes a **new personal record** — which zones this picker means to
walk to — and AGENTS.md §11.1 forbids adding personal data without a recorded purpose and lawful
basis. Until now the record had no home, no surface and no owner decision.

Two things made the absence the wrong answer once the rest of the frame was built:

- The frame draws the control, and a bookmark that forgets the moment the screen closes is not a
  bookmark: the design's own gesture is a **plan** the picker can act on the next day.
- The pattern for a device-local record already exists and is accepted: the consent record
  (ADR-020) is a versioned AsyncStorage value, written only by a user action, never sent
  anywhere, with its four open questions answered in the module's own documentation.

The frame gives the record no list screen: the design's collection surface is frame 14's
**“Saved spots” row**, and that screen was never designed as a frame of its own. So the record
can be written and shown on the zone's own screen, and a surface that lists the whole plan
remains an open gap rather than something to invent here.

## Decision

1. **The plan is a record on the device**, not a screen's state: `picky.saved-zones.v1` in
   `@react-native-async-storage/async-storage` (`src/services/saved-zones.ts`), holding
   `{ zoneId, savedAt }` per saved zone. It is **sent nowhere** — no processor, no transfer, no
   network call — and it holds no coordinate, device identifier or account id: the zone's own
   identifier, as the design spells it (“Z14”), and when it was saved.
2. **The key is versioned**, and reading is **fail-closed**: a value the app cannot understand
   reads as no saved zones, never as a zone the picker did not save. An entry that is unreadable
   is dropped rather than making the whole plan unreadable.
3. **One write per user decision.** The only caller is the frame's own control; there is no
   effect that saves on render, and saving a zone that is already saved leaves the record as it
   is (the control is a toggle, so a second save is a stale press, not a second plan).
4. **The same control removes it, and the failure is reported.** A refused write rejects; the
   screen re-reads what is stored and says the zone could not be saved or removed, so the
   bookmark can never light up over a record the device did not keep.
5. **The saved state is a shape, not a colour**: an outline bookmark for a zone that is not in
   the plan, a filled one for a zone that is (Material Icons, since Feather ships only the
   outline), plus the accessible state and a name that says what the next press does
   (“Save zone” → “Remove zone from saved zones”).
6. **While the record is being read the control is disabled.** A record that has not answered is
   not a “not saved”, so the control claims no state rather than the wrong one.
7. `clearSavedZones()` exists for the deletion path AGENTS.md §11.1 asks for (signing out), and
   is tested for that purpose.

## Alternatives considered

- **Leave the control out until the plan has a screen.** The state before this decision, and
  honest about the gap — but it answers the frame's own gesture with nothing, and the record is
  needed by the surface that lists the plan whenever that surface is designed.
- **Keep it in the screen's state.** Zero plumbing and no stored field, but the bookmark forgets
  when the screen closes, which is not what a saved zone means.
- **Store it behind the account, or in the backend.** The only way for a plan to survive a
  reinstall or be shared with another device — and the natural home once zones are server-owned.
  Rejected *now*, not in principle: there is no backend (ADR-015), no account surface and no
  lawful basis recorded yet (PROJECT.md, open question 15); a network call carrying a personal
  field would create a processor and a transfer on its own.
- **`expo-secure-store`** (ADR-006). Wrong tool, exactly as for the consent record: this is not a
  credential, and the keychain would make “is this zone saved?” depend on the device rather than
  on the picker.
- **A “Saved spots” list screen of our own design.** Tempting, and it would make the plan
  visible, but the design gives it no frame: the app would be inventing a screen, and the design
  is the source (ADR-016). The gap is recorded instead.
- **Save without the removal gesture** (a bookmark that only fills). Rejected: a record the user
  cannot take back is not theirs, which is the same reasoning the consent record follows.

## Consequences

- The four questions AGENTS.md §11.1 asks are answered in the service's own documentation: this
  app on this device may read the plan; the zone's own screen shows that zone's state, and a
  surface that prints the whole plan is not built yet; the same control corrects it;
  `removeSavedZone()` and `clearSavedZones()` plus uninstalling the app delete it.
- Frame 07 now draws every control it can act on: the bookmark, “Navigate” (when a route supplies
  frame 08), the back control and the core navigation.
- **A saved zone is invisible outside that zone's own screen.** That is the honest limit of the
  record today, and it is recorded in PROJECT.md rather than papered over with an invented list.
- The lawful basis for storing the plan is the owner's, still open (open question 15), and is owed
  for every field the app keeps — this one included, alongside the report queue and the consent.
- A future surface for the plan (frame 14's “Saved spots”) reads the same record through the same
  hook (`useSavedZones`), in the shape ADR-020 established for a device record.
