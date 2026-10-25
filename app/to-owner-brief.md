# What to answer first — the decisions ranked by what each unblocks

**To:** the project owner (the §1 of Parts 1 and 2 and Part 5's §1–§3 are the Figma design owner's;
Part 3 §1 is our reading to correct). **The send:** [cover note](to-questionnaires-cover-note.md) ·
[response sheet](to-questionnaires-response-sheet.md) ·
[one printable document](to-questionnaires-combined.md) — deadline **2026-10-17**.
Ranked by how much is waiting on each answer, not by how little time it takes. Partial answers are fine,
as the cover note says; this page adds what each answer moves in the code.

**1 · The zone service — Part 3, 16 slots.** The single largest unlock: three shipped things wait on a
zone source — the map and its list still show the design's sample, the saved plan holds identifiers it
cannot describe, and the first backend slice's record names a zone with no zone behind it — and the real
basemap (ADR-031) waits for geometry to draw. **What the answers change in code:** `DEMO_ZONES` — the one
constant a real source replaces — becomes real, and the screens drop the demo disclosure with it;
`zone-containment.ts`'s “first matching zone wins” is replaced by the overlap answer, its cases first; a
payload validator lands beside `visit-policy.ts`'s pattern; the season answer decides whether the map's
colours are curated or derived. **Start with §1** — one pass over our reading, and a correction is the
most valuable answer in the send.

**2 · The first backend slice — Part 4, 13 slots.** The only decision that gates a **deployment** rather
than a drawing: the app sends nothing today, and where the first slice runs — region, lawful basis,
invite mechanics — is entirely yours. **What the answers change in code:** deliberately almost nothing
in the app — the wire contract's blocking list ([docs/api-contract.md](docs/api-contract.md) §8) loses
the answered items, ADR-033's slots fill and it moves from Proposed to Accepted, and each new processor
becomes a line in the privacy notice; if the invite mechanism changes, `share-access.ts` and its
conformance cases move first.

**3 · Shared spots — Part 2, 12 slots.** Nothing may be built before a frame exists, and the grant's
field is called “zone id” until §1.2 answers what a *shared* spot is; the frame's “Public” state is drawn
nowhere and decided nowhere. **What the answers change in code:** the frame(s) the designer draws and the
app builds from; a field rename through `share-access.ts`, the contract and its tests if a shared spot is
not a zone; CONTEXT.md's “spot” term settles; the three prototype readings are deleted down to the
winning one. §2.1 decides whether any of it is v1.

**4 · Signing in — Part 1, 17 slots.** Frames 01 and 03 both draw a sign-in link that leads nowhere — the
app renders them as labels, not buttons — and the session runs on a stand-in. **What the answers change
in code:** the `/sign-in` route and screen; handlers on the two links; where the session lives and how
long it lasts decide whether ADR-006's secure-storage adapter is built now, and `SESSION_LIFETIME_MS`
becomes a real value; `sign-out.ts`'s meaning is confirmed or changed (known issue 29). Smallest by size
— about 20 minutes with `npm run prototype:sign-in` open.

**5 · Screen 04 on a phone — Part 5, 12 slots.** The cheapest answers in the send, and the last by what
they unblock: a built screen's words. A picker who signs up *and* one who signs in with a phone number
both walk screen 04, which is the frame's email state — the title “Verify your email”, an action reading
“Change email address”, and a card at the foot addressed to someone who signed up by phone instead.
Nothing is broken by it and no service is waiting on it — the send itself still waits on a transport
(ADR-048) — but the screen keeps naming the wrong identifier until it is answered. **What the answers
change in code:** up to four strings in both catalogues with the layout harness's line counts for
screen 04 (ADR-018/019), one fact passed to the screen deciding which branch's words it renders, the
resend constant and the caller's contract if §4 moves them, and — if the phone state needs a screen or
its own state — a measurement entry and the identifier rule's home (`isEmailIdentifier`, which
onboarding may not import across features as it stands).

Answers land in the ADR already waiting for each part (ADR-033 for Part 4, ADR-034–036 for the rest, and
ADR-049 for Part 5), which names the open questions each one updates and the code or screen it unblocks.

**Waiting outside the send · the background half of location — 5 slots, ADR-047 §2.** Not in the five
documents (they are closed at 70 slots), and it blocks nothing that is built: the copy and the consent
record now state what the app does — tracking while the app is open — so nothing promised is missing.
What it decides, when you want to answer it: whether Picky ever captures in the background at all
(§2.1); if yes, the iOS “Always” string and Android background-location declaration with their store
justifications (§2.2); the watch's cadence and battery cost (§2.3); the lawful basis for reading a
position (open question 15, §2.4); and what may be kept from a visit, against ADR-014's 12 months
(§2.5). **What the answers change in code:** `app.json`'s plugin switches and the guard that fails if
any of them appears; a second consent purpose and the copy in both languages; the watch options in
`src/services/location/expo-source.ts`; the notice's record list. Answering §2.1 “no” closes the rest
and means the frames lose a line rather than the app gaining a permission.
