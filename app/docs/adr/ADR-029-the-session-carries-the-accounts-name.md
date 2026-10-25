# ADR-029 — The session carries the account's name

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Project owner (asked to finish the frames' remaining parts; the shape below is this repository's)

## Context

Frame 14 draws an account row at the top of the settings screen: an avatar with a monogram, the
person's name, and the identifier the code was sent to with what was verified about it
(“AK” / “Aino Korhonen” / “aino@example.fi · Email verified”, node `5:23613`).

The app could not draw it. Screen 03 collects a name — the form refuses to submit without one —
and then dropped it: only the address travelled to screen 04 (`pending-verification.ts`, whose own
note said “the name and the password … are not screen 04's business”), and the session the port
issues held the account's identifier and its two timestamps and nothing else (ADR-028, ADR-027).

Two things followed from that. The settings screen could not say **whose** settings it was showing,
which is the one thing an account surface exists for. And the name was **personal data collected
for no purpose**: asked for on screen 03, written nowhere, read by nothing — the opposite of the
least-collection rule in AGENTS.md §11.

## Decision

The name travels the same path the identifier does, and the session holds it.

- `Credential` gains `displayName` (`stand-in-port.ts`): what screen 03 collected, which a real
  provider stores as the profile's display name. The stand-in refuses a credential that gives the
  account no name, exactly as it refuses one that names no account.
- `Session` gains `displayName`, and `parseSession` requires it: a stored value without one is not
  a session, the same strictness every other field of the record already gets.
- The name is carried between screens 03 and 04 by the feature's in-memory pending request
  (`VerificationRequest`), and screen 04 hands it to the port with the code. The **password** still
  never leaves screen 03.
- The settings screen reads it back through a shared `useSession` hook and draws the frame's row
  from it, deriving only what the frame assumes: the monogram (`profileInitials`) and whether the
  identifier was an address or a number (`isEmailIdentifier`, which decides between the frame's
  “Email verified” and its phone counterpart).

## Alternatives considered

- **A fourth port operation to attach a name later** (`signIn` then `setDisplayName`). The port's
  three operations are deliberately the whole of what the app does with a session (ADR-028); a
  fourth one would exist to work around a sign-up step the app already performs.
- **Keeping the name out and drawing the row from the identifier alone.** Then the frame's row is
  half-empty forever, the name stays a question the app asks and ignores, and an account surface
  still cannot say whose settings these are.
- **Storing the name as its own device record** (a “profile” beside the consent and the plan).
  It has no reason to outlive the session, and every stored field owes AGENTS.md §11's four
  answers — including who else on the device may read it. The session's own answers already cover
  it: it lives in memory for as long as the process does.

## Consequences

- The session's field list gains one more item, and its four answers gain the account row as the
  **copy** path: the settings screen shows the name back to the user.
- **The lawful basis for holding a name is still open** (PROJECT.md, question 15, which is owed for
  every field the app keeps). This ADR records the purpose — the account's own name, shown to its
  owner — not the basis.
- The name is part of what a **production** account service has to be able to answer: a provider
  that cannot name the account cannot fill the frame's row. Firebase keeps the same value as
  `displayName`, which is where the word comes from.
- The layout harness cannot seed a session — it is held in the process, not in storage (ADR-028) —
  so the account row's copy is deliberately absent from the frame-14 measurement entry, and
  `e2e/accessibility.spec.ts` walks the sign-up and asserts the row on the built app instead.
- Screen 04's cold-start fallback names the frame's example address **and** its example name
  (`EXAMPLE_NAME`), the same way it already named the address.
