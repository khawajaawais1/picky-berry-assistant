# The copy-claims audit

A scan of **every shipped string in both catalogues** for claims this app cannot currently keep —
background capture, automatic detection, delivery and sync, sharing and visibility, trust
judgements, push alerts, payments held, forecast services, and anything the app says it has sent.
Done 2026-10-12, in both languages, against the working tree as it stood that day — and **extended
2026-10-13** with a fourteenth family, the identifier claim (row 14), which that pass could see and
had no vocabulary for ([ADR-049](adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) §7)
— and the same day with the copy that made it, the family's two strings drawn only where they are true
(ADR-049 §3.1–§3.2, assumed there pending the owner's answer). It gained a fifteenth the same day, from
the other audit: a label that named a **step the app never takes** (row 15 — the control audit's own
family 8), fixed at [ADR-050](adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md). That
one is the shape this table was not built for either: a *label* on a control rather than a sentence
about something the app has done.

**Screen 04 retired on 2026-10-24** ([ADR-059](adr/ADR-059-email-password-replaces-the-code-screen.md)),
so rows 3 and 14 below — and the verification strings they name — are the audit's history, not the
shipped catalogue. The scan's families remain: row 3's delivery family is still fixed to no matches,
and row 14's family is now empty because the app offers an email address only.

This file is the **index of where each claim is recorded**, not a second place to record it. The
demo rows it points at are [demo-and-stand-ins.md](demo-and-stand-ins.md)'s; the issues are
PROJECT.md's “Known issues”; the decisions are the ADRs. What this file adds is the two things
those three cannot say on their own: **which shipped strings make a claim at all**, and **which of
them were not recorded anywhere yet**. The standing check is
`src/config/__tests__/copy-claims.test.ts`, whose ledger is the table below in code.

The scan has **two halves since 2026-10-13**: the shipped strings, the two catalogues in both
languages (rows 1–15), and the words the **review-only prototype readings** propose — literal English
in review paper, read from source and held to the same vocabulary through a **second ledger** (row 16).
The second half closed the last surface the accessibility walk, the layout harness and this scan had
between them: the readings were measured and walked, and their wording was read by nothing at all.

## How the scan was made, and what it cannot see

The method is a **word-driven sweep** of the two catalogues (`src/services/i18n/locales/en.ts`,
`fi.ts`) for the vocabulary a capability claim uses — *automatically, detected, synced, sent,
delivered, cached, escrow, forecast, push, live, others see, background* and their Finnish
counterparts — followed by reading each hit in its screen and against the code that renders it. Since
2026-10-13 the sweep also carries the vocabulary of **the account's own identifier** (*your email*,
*sähköpostisi*, *vaihda sähköposti*), which is row 14's claim rather than a capability's.
A claim phrased with none of those words is invisible to it, and the scan judges **claims, not
tone**: whether a sentence reads well, or whether a Finnish translation says the same thing as its
English original, is a review question this file does not answer (PROJECT.md open question 13).

A composition can also be less true than its parts: a screen of individually-hedged strings can
still assert a capability. Those are the harness's findings (F1–F7 in
[demo-and-stand-ins.md](demo-and-stand-ins.md)), not this scan's.

**The prototype half reads source rather than a catalogue, and with the TypeScript compiler rather
than with a text search.** The readings' words are hard-coded English by design — a prototype's
wording is not a translation anyone should review — so no key exists to sweep. What the scan reads
is every `.tsx` in a `prototype` folder under `src` (found by walking, so a third prototype is scanned
the day it exists), and in each the **words a reviewer reads**: JSX text (whitespace collapsed, so a
sentence wrapped across two lines is one word) and the literal values of the props that carry copy
(`label`, `title`, `eyebrow`, `placeholder`, `accessibilityLabel`). Comments, `report(…)` notes and
interpolated strings are not copy, and the compiler is what tells them apart — measured: a plain text
search over the three prototype files matches fifteen lines for this vocabulary, and twelve of them
are the word *background* inside a style property (`backgroundColor`, `colors.background`). What this half cannot see is the same thing the other cannot
(a claim phrased in words the families do not carry, and a claim made by a composition), plus one of
its own: **a word the reading builds at runtime** rather than writes — nothing in the readings does,
and a reading that started to would be outside the scan.

## The claims, and where each one is recorded

`Fixed` means the copy was changed; `Disclosed` means the design's own composition ships with the
screen saying so; `Recorded` means a known issue or finding already carried it; `Open` means it is
recorded and still unresolved.

| # | Family | The strings (both languages) | What the app actually does | Verdict | Where it is recorded |
| - | ------ | ---------------------------- | -------------------------- | ------- | -------------------- |
| 1 | **Capture in the background** | none | Reads a position in the foreground only, and only while a screen asks (ADR-045) | **Fixed** (2026-10-12) | [ADR-047](adr/ADR-047-the-consent-says-what-the-app-does.md) §1 (five strings), plus four this scan found: the export document's consent lines and two Finnish strings that had kept the heavier word |
| 2 | **An arrival or exit detected automatically** | `discover.visit.arrived.title` “Arrival detected automatically” / “Saapuminen havaittiin automaattisesti”; `discover.visit.supporting` “Leaving the mapped area ends the visit automatically…” / “…päättää käynnin automaattisesti…”; `report.exit.title` “Exit detected · visit complete” | Detects nothing: no watch runs, and the visit screen's timer is seeded from `DEMO_ACTIVE_VISIT` | **Disclosed** | Known issue 17; demo rows A5, A6; PROJECT.md known issue 26 for the stored half |
| 3 | **A message the app sent** | **was** seven strings: `onboarding.verification.heading` “Check your inbox.” / “Katso postilaatikkosi.”, `onboarding.verification.supporting` “…the code we sent to {destination}…” / “…{destination} lähettämämme 6-numeroinen koodi.”, `onboarding.verification.phoneNote.body` “…a code sent by SMS.” / “…tekstiviestillä lähetettyä koodia.”, `onboarding.signIn.supporting` “We send six digits to your email or phone.” / “Lähetämme kuusi numeroa…”, `onboarding.signIn.action` “Send me a code” / “Lähetä minulle koodi”, `privacy.accountSecurity.reach.body` “…a six-digit code sent to your email or phone…”, `privacy.termsPrivacy.record.account.value` “…the address or number the code went to.” / “…johon koodi lähetettiin.” | Sends nothing: there is no transport at all, the code is the stand-in (`000000`), and the notice's own line says the app “sends nothing anywhere” | **Fixed** (2026-10-12) | [ADR-048](adr/ADR-048-the-verification-copy-claims-no-delivery.md) §2 — all seven rewritten in both languages to name the destination the code belongs to, with the frame's own words recorded per branch; the scan's family is empty and asserted empty. Known issue 32; the stand-in itself is known issue 24 |
| 4 | **A verification that happened** | `privacy.account.verifiedEmail` “Email verified”, `privacy.account.verifiedPhone` “Phone verified”, read by `privacy.account.line` | Nothing verified the account: the stand-in code did, in a development build | **Recorded** | Known issue 27; ADR-027 |
| 5 | **A visit that reached a server** | `discover.season.row.synced` “Synced” / “Synkronoitu” | Nothing syncs. Every report the phone holds is `queued`; only the design's two sample rows can print “Synced”, and they carry no marker of their own | **Recorded — Open** | Demo rows A9, F1 (the rows sit in the same list as the picker's own); PROJECT.md known issue 19 |
| 6 | **Cached tiles, a saved forecast, a last sync** | `offline.cached` “Cached” / “Välimuistissa”; `offline.forecast.title`, `offline.forecast.detail`, `offline.lastSync`; `offline.retry` “Retry sync” / “Yritä synkronoida uudelleen” | Nothing is cached, downloaded or synced. The two actions are drawn as readings with no role, because there is no transport to retry over | **Disclosed** | Demo row A16 (ADR-042 — the screen says so, in its eyebrow and its own sentence) |
| 7 | **A forecast or weather source** | `discover.details.forecastDisclaimer`; `discover.details.weather` “{temperature}°C · {wind} · Forecast at {time}”; `discover.alert.eyebrow` “…FORECAST REASONING…” / “…ENNUSTEEN PERUSTEET…”; `offline.forecast.title`; `offline.refresh.note` “Refresh forecasts online each day before you go.” | No weather source exists; the figures are the design's | **Disclosed** | Demo rows A3, A10, A16; finding F2 (the sentence that claimed a model was rewritten) |
| 8 | **A push alert** | `discover.alert.preferences.push` “Ripe-berry push alerts” / “Push-hälytykset kypsistä marjoista” | No alert is sent and nothing reads the radius, the quiet hours or the species | **Disclosed** | Demo row A17; ADR-043; known issue 20 |
| 9 | **A trust judgement** | `discover.details.reports.trust.trusted` “Trusted”, `…unverified` “Unverified” / “Luotettu”, “Vahvistamaton”; `market.seller.metaUnverified` | Nothing verifies a report or a seller: the labels are the design's own vocabulary for reports no service has judged | **Disclosed** | Demo rows A3, A12 |
| 10 | **Money held in escrow** | `market.listing.escrow` “Planned provider escrow protects payment…”; `market.order.status.confirmed` “Order confirmed · payment held”; `market.order.hold.body` “Payment stays held until delivery is confirmed.”; `market.order.confirmed.body` “Demo payment is held by the provider.”; `market.order.disputeNote` | No payment provider exists; the order is arithmetic over the frame's figures | **Disclosed** | Demo row A12; finding F4; known issue 22; ADR-026 |
| 11 | **A message delivered to another person** | `market.chat.pack` “Great, I'll pack 5 kg for you. Please order in Picky so payment is held safely.” and the rest of the thread | There is no chat transport; the composer is drawn without an input role | **Disclosed** | Demo row A12; ADR-026; ADR-044 |
| 12 | **Other people seeing your position** | `onboarding.location.reassurance`, `onboarding.createAccount.privacy.body` “Saved spots default to private. Your GPS trails are never public.”, `discover.visit.privacy` “Only you can see your track…”, `privacy.trailsNote.title` and `.body` | Nothing is shared anywhere: no share is sent, and no live position leaves the device | **Recorded** | PROJECT.md “Recorded requirement: shared spots” §1 (owner-affirmed 2026-10-10 — these sentences stay as they are); known issue 31 |
| 13 | **The app sending data at all** | the notice's own lines (`privacy.termsPrivacy.*` “the app sends nothing anywhere”, the export screen's “The app sends nothing itself.”) | True — and the reason every family above is a claim rather than a feature | **Kept** | — |
| 15 | **A settings step the app never takes** | **was** `onboarding.location.action` “Continue to location settings” / “Jatka sijaintiasetuksiin”; the key is unchanged and now reads “Continue to the map” / “Jatka kartalle” | Screen 05's press records the consent **on this device** and opens the app's map, exactly as its “Skip without tracking” action does. Nothing sends the reader to the platform's own settings and no location-settings screen exists: the permission is asked *in* the app the first time a screen reads a position (ADR-045) | **Fixed** (2026-10-13) | [ADR-050](adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md) — the action says what the press does, no settings surface is built for it to open, and the frame's own words are kept as the label for the journey that really does lead to one. [docs/control-claims-audit.md](control-claims-audit.md) family 8 indexed the label first; the scan below holds it now, as a family that is **empty and asserted empty**. PROJECT.md known issue 33, closed |
| 14 | **An address as the account's identifier** | **was** two strings — `onboarding.verification.title` “Verify your email” / “Vahvista sähköpostisi” and `onboarding.verification.changeEmail` “Change email address” / “Vaihda sähköpostiosoite” — drawn whatever the destination was, beside `onboarding.verification.titlePhone` “Verify your number” / “Vahvista puhelinnumerosi” and `onboarding.verification.changePhone` “Change phone number” / “Vaihda puhelinnumero” for a number. All four keys were **deleted with screen 04 on 2026-10-24** | Nothing now: the screen and its keys are gone. When it existed, the screen was reached with either identifier — screen 03 and the sign-in screen took an address *or* a number (ADR-034 §1.2) — so the number used to stand where an address would while the title and the way back to the field named an address. Screen 03 now collects an address and a password, and the sign-in screen an address and a password, so no string of the family is drawn | **Fixed** (2026-10-13); **retired** (2026-10-24) | [ADR-049](adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) §3.1–§3.2 — the **assumed** answer that fixed it, kept as history; [ADR-059](adr/ADR-059-email-password-replaces-the-code-screen.md) retired the screen, its phone branches and its keys, and PROJECT.md **open question 20** was retired with them (the questionnaire it was asked as stays at [to-questionnaire-verification.md](../to-questionnaire-verification.md) as the record) |
| 16 | **A claim a review-only prototype reading proposes** | the sign-in reading A's supporting line “We send six digits to your email or phone. No password to remember — and none to leak.” and its action “Send me a code” | Sends nothing, the same as row 3 — and these are **the words the app itself shipped until 2026-10-12**, the ones ADR-048 rewrote | **Recorded** (2026-10-13) | The scan's **proposal ledger** (`PROPOSALS`), one entry per string with the reading it belongs to and why it may sit there; [ADR-048](adr/ADR-048-the-verification-copy-claims-no-delivery.md) §2 (the action's words are the branch that earns them, “restored” the day a transport exists) and §5 (the shipped family is cleared and asserted empty). [to-questionnaire-sign-in.md](../to-questionnaire-sign-in.md) §1 owns the reading and §3 the words. Row 3 is the same claim in shipped copy |

**Kept** families are recorded here as checkable facts, so a later reader does not have to re-derive
them: the scan found no shipped string promising background capture, no string claiming a retry that
happens automatically, and no string claiming an encrypted or cloud-stored copy of anything. And
since 2026-10-12 the standing check asserts the same about a delivery (row 3): no shipped string, in
either language, claims a message the app sent.

**Row 14 is the one family the 2026-10-12 pass could not have found**, and that is worth stating
plainly: the sweep was written for claims about *what the app does* — a message sent, a capture, a
sync — and this is a claim about **which identifier the account has**. The strings were on screens
that pass read; the vocabulary was not in its list. [ADR-049](adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md)
§Context records the gap, and its §7 asks for the family with **its keys on the ledger and its
planted originals** — which is what the standing check now holds, both keys recorded with the
question each waits on, and **the same day the copy itself followed the identifier**, so the two
keys are drawn only where they are true (ADR-049 §3, assumed until the design owner answers). One
direction of the same claim stays a **named gap** rather than vocabulary: the mirror — a number named
where the account may hold an address — which no shipped string does today. A guard is only as wide
as the words it knows; this row is what that costs when the words are about identity rather than
capability.

## What the audit changed

- **Four families were fixed**, not just recorded. Background capture (row 1), which was a standing
  promise on the consent screen — the one place where the promise *is* the product — see
  [ADR-047](adr/ADR-047-the-consent-says-what-the-app-does.md); the delivery claim (row 3), see
  [ADR-048](adr/ADR-048-the-verification-copy-claims-no-delivery.md); and the identifier claim
  (row 14), whose two strings are now drawn only where they are true — the frame's title and change
  action for an address, two new keys for a number — see
  [ADR-049](adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) §3. The third is
  the one fix whose *wording* is still the design owner's and the owner's to confirm: it is this
  repository's assumed answer (2026-10-13), recorded as such at each slot it fills. The fourth
  (row 15) came from the other audit's index rather than from this scan's sweep: the control audit
  had already found screen 05's action naming a settings step the app never takes (its family 8, known
  issue 33), and the fix — the label says where the press leads, [ADR-050](adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md)
  — brought the claim here, because a *label* claim belongs to the scan that reads both catalogues.
- **Four more strings of that family were found by the standing check, not by the manual pass** —
  which is the argument for having one. Two were the export document's own consent lines
  (`privacy.export.contents.consent.on`/`.off`, “Background tracking on/off”), which the copy the
  picker takes away would have carried; two were **Finnish strings that had kept the heavier word
  after their English originals changed** (`privacy.termsPrivacy.record.consent.label`,
  `privacy.accountSecurity.signOut.note`). The scan reads both catalogues for exactly this reason:
  a translation can say more than its original, and nothing else in the gate compares them for
  meaning.
- **One family had no record anywhere** and now does: row 3, the verification copy that says a
  message was sent. It was **known issue 32** in PROJECT.md — the app saying it sends nothing while
  screen 04 said it sent a code — and it was recorded rather than rewritten, because the honest
  wording depends on the answer the flow is waiting for (open question 12: which account service,
  and therefore whether a code goes by email, by SMS, or by nothing a build without a service can
  claim). **The owner asked for the wording on 2026-10-12 and it followed that day**: what the copy
  may say while no service exists, and the sentence each branch turns its own line back into, are
  [ADR-048](adr/ADR-048-the-verification-copy-claims-no-delivery.md) §1–§2.
- **The scan's own vocabulary was the reason row 3 was half-recorded**, and fixing the family found
  the rest: the three strings in the ledger were the ones phrased the way the pattern looked for.
  **Four more strings made the same claim with other words** — “Check your inbox.” as a heading,
  “We send six digits…” and “Send me a code” on the sign-in screen, and the notice's own account
  record, whose Finnish said “koodi lähetettiin” where its English said only “the code went to”.
  The pattern is wider now (ADR-048 §5), and its planted originals cover this family too: a scan is
  only as wide as the words it knows.
- **The last surface with no wording check came under one** (2026-10-13, row 16). The prototypes are
  the paper a designer judges by flipping between readings, and their words were the only copy in the
  repository that nothing read: the catalogue scan enumerates keys, and the two browser harnesses
  measure layout and the accessibility tree. Reading them found the tension worth recording — the
  sign-in reading proposes **the two sentences the app shipped until 2026-10-12**, which ADR-048
  removed because nothing in the app sends a code. Recorded rather than reworded: a prototype's words
  are the design's, an open questionnaire owns them, and this repository does not invent wording (the
  same treatment row 15 got before the owner decided it). What the record makes visible is the
  direction of the fix: these words are not in a catalogue, so they cannot ship, and adopting the
  reading means rewriting them first — after which the shipped half of this same scan holds them.
- **The scan's vocabulary was proven for the prototype half before it was ever pointed there**: two of
  the planted originals of `a-message-the-app-sent` **are** these two sentences, held since ADR-048
  because they are what the app shipped — so the new half could not have been green by accident.
- **One family is recorded and unresolved**: row 5, the design's two sample visits printing
  “Synced” in the same list as the picker's own queued rows (finding F1, demo row A9). The fix is
  the same one known issue 26 needs — rows that carry their own marker — and it stays open rather
  than being silently rewritten, because the marker is a design decision about the history list.

## Keeping it from drifting

`src/config/__tests__/copy-claims.test.ts` scans both catalogues for the claim vocabulary of the
families above — thirteen of them since 2026-10-13, from background capture to the account's own
identifier (row 14) and the settings step the app never takes (row 15) — and fails when a string
matches a family that does not list it. Its ledger is
this table's rows, with each entry's reason and its record; a family with no matches is asserted to
still have none, so a string re-introducing a background promise fails the build instead of
shipping.

**The prototype half has the same shape and its own ledger** (`PROPOSALS`): the readings' words are
read from source (see above) and matched against the same thirteen families, and every match has to
name the reading and the reason it may make that claim there. Two rules keep that ledger honest the
way the catalogue one is kept: a **proposal whose words have moved on** fails, so the record cannot
outlive the reading; and a **family id that is no family** fails, so a typo cannot retire a claim
quietly. The readings are review paper — deleted when the design question is answered — so the ledger
is expected to empty itself when they go, and the rule that refuses a stale entry is what makes that
loud rather than silent.

Like the other document guards, both halves are honest about being a **word scan**: it cannot judge
tone, it cannot see a claim made by a composition of true sentences, and it cannot hear a claim whose
words its families do not carry.
