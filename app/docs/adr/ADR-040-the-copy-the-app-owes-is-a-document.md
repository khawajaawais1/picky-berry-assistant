# ADR-040 — The copy the app owes is a document, handed over through the platform's own share sheet

- **Status:** Accepted (2026-10-11)
- **Deciders:** the project owner asked for the remaining screens (2026-10-11); this repository wrote
  the screen and the document's shape, and both are reviewable where every app-drawn screen's is.
- **Related:** [ADR-014](ADR-014-retention-policy.md) (what a stored field owes),
  [ADR-020](ADR-020-record-consent-on-device.md) (the consent record),
  [ADR-024](ADR-024-saved-zones-on-the-device.md) (the saved plan),
  [ADR-028](ADR-028-an-authentication-seam-behind-a-port.md) (the session),
  [ADR-039](ADR-039-frame-14s-two-remaining-rows-get-their-screens.md) (the notice this screen is
  reached from, which named the copy as still owed), and
  [ADR-005](ADR-005-offline-first-sync.md) (the queue, and the app's “sends nothing” stance).

## Context

Four records exist on the device: the **session** (ADR-028, in memory), the **visit-tracking
consent** (ADR-020), the **saved plan** (ADR-024) and the **queued reports** (ADR-005). AGENTS.md §11
asks each stored field four questions — who may read it, how it is corrected, how the user gets a
copy, and how it is deleted — and the answer to the third was, for all four, “not built yet”. It was
written on the screens that name them: frame 14's notice says so out loud
(`features/privacy/components/terms-privacy-screen.tsx`, ADR-039), and PROJECT.md's open question 23
records the same gap for the two records it covers, naming what would close it: “a share the queued
report, or a file export”.

Two shapes of work were left over by that. A copy needs **a place to ask for it** — the notice is a
statement, and the frame drew no row for an action — and it needs **a form**: something a user can
take somewhere else, which a sentence on a screen is not.

What makes this a decision rather than an implementation detail is what an export *is* under this
project's privacy position. The app sends nothing anywhere (SECURITY.md §17) and holds no transport
(ADR-005); a “copy” that left the phone on its own would be the first thing the app ever sent, and it
would create a processor, a transfer and a lawful basis that no one has decided (PROJECT.md open
questions 15, 16). The copy therefore has to be something the **user** takes, with the app choosing
neither the destination nor the route.

## Decision

**The app offers one app-drawn screen where a copy of the device's records is taken, and the copy is
a document handed to the platform's own share sheet.**

1. **The screen — “Your data” (`/your-data`)** — is reached from the notice's own row, which named it
   before it existed (ADR-039), and sits where the notice does: the Profile destination of the app
   shell (ADR-022). **The design never drew it.** It states, in this order: what the copy contains,
   record by record, with each record's own value; what the file is, including what it deliberately
   does not hold; and where it goes — that sentence before the control, so nobody opens a part of
   their phone's UI without being told that is what the control does.
2. **The copy is one JSON document** (`features/privacy/domain/export-document.ts`), named and
   versioned by its own field: `picky.personal-data.v1`. It carries the account (the session), the
   consent, the saved plan and the queued reports, each with the values the services already store.
   **Its keys are the app's own field names, untranslated** (`accountId`, `yieldRating`, `decidedAt`):
   portability means a copy another tool can read, and a translated key would be a file this app
   could no longer read back. A record the phone does not hold is written as `null` or an empty list
   rather than left out — “this phone holds no consent” is a fact about the phone, and a missing key
   would be a fact about the writer.
3. **What the document never contains**: no token, no password, no device identifier, no storage key,
   no secret. The app has none of those to give, and the document's key set is asserted in its test,
   so a field added to a record cannot reach a copy of the user's data without that assertion being
   changed too.
4. **The copy is built when it is asked for**, not when the screen draws, and its `generatedAt` is
   that moment: a copy is of the phone as it is when the user asks.
5. **The handing over is the platform's own share sheet** (`src/services/share-text.ts`, React
   Native's `Share`). The app picks no destination, learns none, uploads nothing and stores nothing
   new; what the sheet does with the copy is the user's choice, made outside the app. The platform's
   answer is typed — `shared` or `dismissed` — and a platform that would not open a sheet
   **rejects**, which is reported rather than swallowed (AGENTS.md §2.3). The screen says the copy was
   *handed over* and never that it arrived anywhere: iOS reports the first even when the user backs
   out of the sheet.
6. **A read that failed is carried into the copy.** While a read is in flight nothing is claimed; if
   any of the four reads failed, the document says `incomplete: true` and the screen says the copy
   may be missing something, rather than presenting a short list as the whole of what the phone
   holds. What was read is carried either way — it is still the user's.
7. **The control is drawn where the route hands a handler, and not otherwise.** A platform with no
   sheet, or a screen mounted without the wiring, draws no action and no sentence about one: a
   control that cannot act claims no role (AGENTS.md §11.2).
8. **No new record, no new processor, no new transfer, and no new lawful basis.** Nothing is written
   and nothing is sent by building or using this; the only thing that leaves the phone is what the
   user picks in a sheet the platform owns. The lawful basis for the four records themselves remains
   open question 15, unchanged by this decision.

## Alternatives considered

- **A file export** (`expo-file-system` + `expo-sharing`): closer to what a data-protection reviewer
  expects to see, and wrong for this step. It writes a file onto the device — a new artifact with its
  own retention question — needs a native module (a development build; AGENTS.md §10), and solves
  nothing the device's own share sheet does not already: the same sheet is where a file would go
  anyway. Revisit when a copy has to carry bytes rather than text, which is when evidence media
  arrives (PROJECT.md decision 17), not before.
- **“Send me a copy” by email**: the app would need an address, a mail processor, a transfer and a
  lawful basis — a server that does not exist, plus three owner decisions, in exchange for a step the
  user performs in their own UI.
- **List the records and call that portability.** What the notice and frame 13 already do: it lets a
  user *see* what is held, and hands nothing over. The four questions ask for a copy, not a view.
- **Put the action inside the notice (ADR-039's screen).** One destination fewer, but the notice is a
  statement whose whole point is that every word about a record can be read at once; a route that
  hands personal data to the operating system deserves its own screen, its own explanation of the
  file, and its own test.
- **A list of the app's own share destinations.** It would tell the app where the copy went, which is
  the one thing this position says it must not know.

## Consequences

- AGENTS.md §11's third question now has an answer for all four device records — the copy, its
  contents and its handover are one screen and one document — and the notice's “not built yet” line
  is replaced by the way to take it.
- Open question 23's portability half is answered for the queue and the plan; what is left of it is
  the lawful basis (open question 15), which is the owner's.
- The document is a format with a version, so the records' shape can change later without an old copy
  being mistaken for a current one, and the key set is asserted rather than described.
- A fifth device record adds itself to `ExportRecords`, `buildExportDocument` and its test, and to
  `features/privacy/domain/held-records.ts` — the same edit the notice needs.
- The screen is classified as drawing none of the design's sample (the demo-disclosure guard) and is
  measured by the layout harness in both languages and at the largest system text size, like every
  other app-drawn screen (ADR-018, ADR-019).
- Costs: one more route, one more screen and one service module; and the Finnish copy of the screen
  joins the rest of the catalogue in open question 13's review.

## References

- `src/features/privacy/components/your-data-screen.tsx`, `src/features/privacy/domain/export-document.ts`,
  `src/services/share-text.ts`, `src/app/(app)/your-data.tsx`, and their tests.
- The row that leads here: `terms-privacy-screen.tsx` (node `5:23688`'s destination, ADR-039).
- PROJECT.md: known issue 21, open questions 15 and 23; the notice's own copy in
  `src/services/i18n/locales/{en,fi}.ts`.
