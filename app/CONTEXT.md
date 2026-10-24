# Picky

The field-observation domain: people move through authoritative berry zones, their
presence becomes a visit, and what they report is scored. This file is the
vocabulary only — no implementation decisions live here.

This is the **app's** glossary. The team-level brief, including the pilot area and the
team's own glossary, is [`../CONTEXT.md`](../CONTEXT.md); the terms below refine it for
the screens and the code, and the four species codes and the H3 resolution come from
there.

## Language

**Zone**:
An authoritative geographic area maintained by the operator, with a stable
identity that visits, scores and moderation records refer to. In the pilot it is **one H3
resolution-8 cell** of forest or mire inside the 60 × 60 km area around Jyväskylä, its id is
`uuid5(h3 index)` and its geometry comes from the `data/` pipeline (`GET /api/v1/zones`).
What the boundary is
**authoritative about**, where polygons come from, and whether anything smaller is curated below a
zone are not settled: they are the owner's calls, asked with the rest of the geometry in
[to-questionnaire-zone-service.md](to-questionnaire-zone-service.md) — the last of the three in
§2.4, which is not the same question as what a *shared* spot is (that one is
[to-questionnaire-community-map.md](to-questionnaire-community-map.md) §1.2, and the two documents
were divided so neither asks it twice).
_Avoid_: hotspot, cluster, patch, region, area

**Visit**:
One user's presence in one zone, opened by a qualifying entry and closed when that
presence ends.
_Avoid_: session, check-in, trip, stop

**Presence segment**:
A continuous stretch of time within a visit during which the user is inside the
zone. A visit that is left and re-entered has more than one.
_Avoid_: ping, reading, track, sample

**Dwell**:
The minimum continuous time inside a zone before an entry counts as a visit;
shorter crossings are ignored.
_Avoid_: duration, wait, delay

**Grace window**:
The period after leaving a zone during which re-entry continues the same visit
instead of opening a new one.
_Avoid_: timeout, cooldown, expiry

## The app shell

What the signed-in screens sit inside. The design draws it on frames 06–14.

**Core navigation**:
The bar at the foot of every screen in the shell, holding the four destinations (frames 06–14,
node `5:23012`). It is the design's word for the bar; the app's component is named after it.
_Avoid_: tab bar, bottom bar, navbar, menu

**Destination**:
One of the four things the core navigation can show — Discover, Visits, Alerts, Profile. A
destination is not a screen: Discover is three screens (the map, a zone's details, the walk to it),
and Visits is three more. What each destination leads to is the shell's business, not the bar's.
_Avoid_: tab, section, page, route (the route is where a destination *starts*)

**App shell**:
The layout that renders a destination's screen together with the core navigation, and the only place
that knows which destination a screen belongs to (`src/app/(app)/_layout.tsx`, ADR-022). Onboarding
is outside it, because frames 01–05 draw no bar.
_Avoid_: wrapper, container, chrome

## Maps

**Drawn map**:
The map the design file draws — the frames' own geometry rendered with `react-native-svg`, the
design's demo zones on it and nothing on it a control
([ADR-021](docs/adr/ADR-021-draw-the-map-from-the-designs-geometry.md)). It is what the app shows
today, and it is **not a geographic map**: it is the design's drawing, and its place names and
shapes are the designer's.
_Avoid_: map (unqualified — the app is about to have two things by that name), illustration

**H3 cell**:
One hexagon of the Uber H3 grid at resolution 8 — ≈ 0.57 km² at 62° N, the pilot's latitude (the
area shrinks with latitude; the team brief records this figure, superseding the
0.74 km² the plan quotes) — which is the shape the team plan gives a zone in its pilot area
(`docs/plans/team-mvp-plan.md` §4). It names the **grid cell**, never the
place: a zone drawn as an H3 cell is still a **Zone**.
_Avoid_: hexagon, tile, grid, polygon (the stored shape, not the identity)

**Basemap**:
The real geographic map: OpenStreetMap-derived vector tiles (Protomaps PMTiles, built by the
`data/` pipeline) **the project hosts itself**, drawn by MapLibre React Native, with real zone
geometry on it
([ADR-031](docs/adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)). It does not exist in the
app yet — there is no tile host, so the map paints a ground colour and the zone polygons. Screen 06
is real geography over the pilot stub's rings through a `ZoneSource` port
([ADR-053](docs/adr/ADR-053-the-discover-map-is-real-geography.md)); frames 08–09 still draw the
design's map. “The drawn map” now means only that drawing, not the app's whole map surface.
_Avoid_: OSM, OpenStreetMap (that is the data's source, not the surface), tile server, Google Maps

## Species

**Species code**:
The four berries the pilot scores, in the spelling the backend and the data pipelines use:
`bilberry`, `lingonberry`, `cloudberry`, `crowberry` ([`../CONTEXT.md`](../CONTEXT.md) §7). The
app names all four; the frame draws three (lingonberry, bilberry and cloudberry), so the app's
chips and screen 10's “More” render `crowberry` after the design's three rather than inside them
— the same vocabulary, one screen wider than the design.
_Avoid_: berry type, variety, plant, crop, blueberry (a different fruit, and not a code)

## People and surfaces

**Field user**:
A person who records visits and feedback in the mobile app.
_Avoid_: forager, harvester, customer, end user

**Moderator**:
A privileged person who reviews reports and decides trust and eligibility outcomes,
working in the operator surface, never in the field app.
_Avoid_: admin, reviewer, judge

**Buyer**:
The role reserved for the **E1 marketplace**, a desired extra that starts only after the core MVP
is stable (`../CONTEXT.md` §2; `../docs/features/README.md`). It is not one of the core MVP's
picker/admin roles and the app has no buyer account: the second path on the design file's
onboarding screen (02) and the frames' “Buyer mode · Preview” are design exploration for that
extra, and nothing browses a real listing or buys today.
_Avoid_: customer, consumer, shopper

**Operator surface**:
The privileged interface, separate from the field app, where zone geometry is
curated and moderation happens.
_Avoid_: admin panel, back office, dashboard

## Identity and the session

What the app knows about who is using it. The provider is decided (ADR-013) and the seam it
arrives behind exists (ADR-028); nothing here is a Visit, and nothing here grants privilege.

**Session**:
One signed-in stretch: the account it is about — the identifier it is named by **and the name it
is shown under** ([ADR-029](docs/adr/ADR-029-the-session-carries-the-accounts-name.md)) — and the
window it is good for. It is the app's
own knowledge, held on the device, and it says **who** the user is and never what they may do.
The word is reserved for this: a **Visit** is presence in a zone and lists `session` among the
words not to use for it.
_Avoid_: login (that is the act, not the record), token (the provider's artefact, not the app's
record), account (who the user is, which outlives one session), signed-in user (a state, not a
thing)

**Credential**:
What a caller offers in exchange for a session: an email address and a password, verified by the
identity provider, which opens the **Account** the API owns ([ADR-054](docs/adr/ADR-054-the-account-belongs-to-the-api.md)).
The app sends the password only to the provider, stores none and holds no hash; the client never
decides whether a credential is valid. A code was the design's credential and is not v1's — phone
sign-in is deferred, so a code survives only as that branch's word.
_Avoid_: secret, login, hash (the app holds none), code (not v1's credential)

**Stand-in**:
An implementation that answers for a service that does not exist yet, accepted for exactly as
long as that is true: one documented code, a lifetime copied from the provider's own token,
nothing persisted, and **nothing accepted in a production build**. ADR-027's verification code
and ADR-028's session provider are the two there are; both are deleted, not disabled, when the
account service lands.
_Avoid_: mock, fake, stub, dummy, demo data (the **Marketplace demo** and **Season summary** are
the design's own values — a different thing with a different word)

## Scoring

**Yield score**:
A per-visit estimate of what was found during that visit, derived server-side from
that visit's own feedback and evidence (feature 6.4's feedback, weighted by 6.5's trust).

The team plan's documents (docs/plans/team-mvp-plan.md) use the same two words for a different
thing: the 0–100 forecast for a *zone* and a species, which is what its map colours zones by. That
is the **Zone yield score** (Zone insight below); unqualified, this glossary's word is the visit's.
_Avoid_: quality score, rating, harvest score, zone score

**Trust score**:
A server-side reliability judgement about one user, based on how dependable their
reports have proven. It is what moderation and eligibility decisions consult.
_Avoid_: reputation, karma, credibility, confidence

**Visit policy**:
The server-owned rule set — dwell minimum, grace window, calendar-day span — that
decides when presence becomes a visit. It carries a version so a decision made
offline can be reconciled against the current policy. The pilot's proposed thresholds are
**10 minutes of dwell and 5 minutes outside** to end the visit (`../CONTEXT.md` §9, still open
until Salman's first field test); the app's `default-1` policy (5 minutes, 30-minute grace)
predates them and is a placeholder, not a decision.
_Avoid_: config, threshold, settings

**Feedback**:
What a user reports about one visit: their observations plus the evidence that
supports them.
_Avoid_: report, submission, post

**Evidence**:
The media (photo or video) captured to support feedback and the yield score of that
visit.
_Avoid_: attachment, upload, media file

**Queued report**:
A picker's own report sitting in the device's queue, between “saved on this phone” and
“received by the back end”. Frame 10's “Save report offline” writes one; frame 13's sync
centre is where the design shows them.
_Avoid_: draft, outbox, pending feedback, submission

**Sync outbox**:
The device-side table the team plan writes every unsynced visit, feedback and photo into, each with a
client-generated UUID that the server treats as an idempotency key. It is the machinery behind a
**Queued report**, not what the picker sees: the picker's record is their own report, the outbox is
how it travels, and only code says “outbox”.
_Avoid_: queue (unqualified, that is the picker's own record), draft, backlog

**Connection**:
What the device itself reports about reaching the network right now, which is all the app may
claim about it: frame 13's “You're offline” is drawn only when the device answers “no”, and a
device that has not answered draws nothing. It is a fact about this phone, never about the
back end or an account.
_Avoid_: connectivity, network status, signal, internet, server down

## Zone insight

What a picker is shown about a zone before setting out (frames 06 and 07). These are
properties of a zone on a day, not of the person looking at it.

**Ripeness**:
Whether the fruit in a zone is ready to pick on that day, as the design's own chip puts
it (“Ripe now”, “Ripening now”).
_Avoid_: readiness, maturity, harvest stage, season

**Zone yield score**:
The 0–100 forecast for one zone on one day, for one species, that the map colours zones by and that
the team plan's `GET /api/v1/zones` returns (feature 6.6). It is a property of the zone and the
species, not of any one visit: it fuses the trust-weighted reports with the yield model as
`α · S_reports + (1 − α) · S_model`, with `α = N_eff / (N_eff + 3)` (`../docs/architecture.md`
§6.2), and it is what the plan's documents call simply a “yield score” — the word this glossary
reserves for the visit's own estimate.
_Avoid_: zone score, site score, prediction score, yield score (unqualified, which is the visit's)

**Score confidence**:
How well a zone's yield score stands up — the frame's “High confidence” — from the
reports behind it and their agreement. It has three levels, **high / medium / low**: high when
`N_eff ≥ 3` and the model's 10–90 % band is narrower than 25 points, low when `N_eff < 0.5` and
the band is wider than 50, medium otherwise (feature 6.2's deep dive). It is a property of the
reading, **not** of a
person; the judgement about a person's reliability is the **Trust score**, and the
design's word must not be read as one.
_Avoid_: certainty, accuracy, reliability, trust

**Route**:
The walk from where the picker is to one zone: how far it is, how long it takes, when
it arrives and the next turn on the trail (frame 08). It leads to a zone, so it belongs
to one zone and is never another zone's walk.
_Avoid_: navigation, directions, itinerary, journey, path

**Saved zone**:
One zone in the picker's own plan — the zones they mean to walk to — written by the
bookmark on that zone's screen (frame 07) and stored on that phone alone. It is the
picker's intent, not a property of the zone: the same zone may be in one picker's plan and
in nobody else's, and it is never a report or a visit. The **Saved spots** screen is the
list of them, in the order they were saved — frame 14's row of that name opens it, and the
design drew no frame for the list itself ([ADR-030](docs/adr/ADR-030-the-saved-plan-gets-a-screen.md)).
_Avoid_: favourite, bookmark, watchlist, collection, plan (as a noun for the record)

**Share**:
One picker's grant of read access to one place, made to the people they invite and revocable by
them. It is the grant and not the place: nothing about a share says what the place *is*, which is
why its own record names a **Zone** until the open question above is answered. Only the server
decides who may read one — the app draws what it is given, and a client check is never
authorisation ([ADR-032](docs/adr/ADR-032-the-first-backend-slice.md)).
_Avoid_: spot (see the note above), permission, ACL, “grant” in user-facing copy (the code's name
for the record is `ShareGrant`)

**Recipient**:
An account a **Share** was made to. A recipient becomes one by redeeming the sharer's own invite
link — never by being found, looked up or named by the sharer's app — so nothing about them is
collected from anyone but themselves, and nothing is stored about them beyond the identifier the
identity provider issued.
_Avoid_: invitee (that is the person before they redeem), member, guest, follower

## Season and alerts

**Visit history**:
The list of visits a picker's own device is holding — the queued reports read back, newest
first (frames 11 and 13). It is the picker's own record, so it is never a sample: what appears
in it was saved on that phone.
_Avoid_: log, timeline, activity feed

**Season summary**:
The figures a picker is shown for a period — what was harvested, how long was spent in the zone
and how many zones were visited (frame 11's “Your season so far”), with the chart of what each
visit brought home beside them.
_Avoid_: statistics, analytics, stats, dashboard

**Alert**:
The design's heads-up about the forest — what is ripe, how far away and
why the app says so (frame 12) — carrying a score and its **Score confidence**. It is core
feature 6.7 (sprint 3): the backend's `reasoning` module runs the ontology's SPARQL rules and
delivers through FCM, and every alert stores its **why**. Nothing produces or delivers one yet,
so the frame's own sample is what is drawn; a delivery promise is defined by 6.7's deep dive, not
by a screen.
_Avoid_: notification, push, warning, heads-up, reminder

## Planned marketplace

The design's four marketplace frames (15–18) belong to **E1, a desired extra** that starts after
the core MVP is stable — not to the nine core features (`../docs/features/README.md`). They are
drawn as the
frames' own disclosed demo, with no listings service, seller account, chat transport or payment
provider behind them ([ADR-026](docs/adr/ADR-026-marketplace-screens-as-a-disclosed-demo.md)).
The words below name what those frames draw, so the code and the copy cannot drift; they are not
names of things the app can yet do.

**Listing**:
One seller's offer of a quantity of one species at a price per kilogram, with a place and a window
to collect it (frames 15–18). The design draws one listing the app has a story for — the one its
card, its screen, the thread and the order all describe — and names a second that leads nowhere.
_Avoid_: product, ad, offer, item, post, lot

**Seller**:
The person a **Listing** belongs to, whose name, rating and verified badge the frames draw.
_Part of E1, not the core MVP_ (see **Buyer**): the app has no seller account, so this word
describes the
design's demo person and nothing the app knows about anybody.
_Avoid_: vendor, merchant, producer, shop, account

**Order**:
What a picker has agreed to take from one **Listing**: a weight, a unit price, a delivery fee and
what is held in total (frame 18). In the app it is **arithmetic over a demo listing's figures**,
never a purchase — no money moves, and the frames' own “Provider test mode” says so on screen.
_Avoid_: purchase, transaction, basket, cart, checkout (that is the flow, not the record)

**Escrow**:
The frames' plan for payment: the provider holds it until the picker confirms delivery (frame 16's
note, frame 18's hold message). Nothing holds anything today, which is why the sentences that
promise it are drawn as the design's **plan** and the two actions that would release or freeze it
are not drawn at all.
_Avoid_: hold, deposit, custody, freeze (a dispute freezes a payment; that is the same absence)

**Marketplace demo**:
The design's own composition behind those four screens — the two listings, their seller, the
sample thread and the demo order (`DEMO_LISTINGS`, `DEMO_THREAD`, `DEMO_ORDER`). It is the same
kind of thing as the **Season summary**'s demo month: the design's values, drawn because the
frames draw them, and never read from or written to anything.
_Avoid_: sample data, mock, fixture, seed, test data

## Vocabulary gaps

No terms yet for what happens when a point is inside **two** zones, and none for the
clock that decides the calendar-day span. Both are recorded as open questions in
PROJECT.md; do not assume an answer in code.

**No term yet for what a shared spot *is* — the grant now has one.** The design's own sharing model
(frame 14) says “spots” and “the community map”, and the owner chose that model on 2026-10-10 —
shared spots, with people you invite, never a position (PROJECT.md, “Recorded requirement”, and
[to-questionnaire-community-map.md](to-questionnaire-community-map.md)). What is unsettled is what
a shared spot *is*: this app's one geographic thing is a **Zone**, and its own copy already calls
the private plan “**Saved spots**” — so a third meaning of “spot” is exactly the trap to avoid. That
question is asked once, in [to-questionnaire-community-map.md](to-questionnaire-community-map.md)
§1.2 — **not** in [to-questionnaire-zone-service.md](to-questionnaire-zone-service.md), whose §2.4
owns the different question of whether a curated unit exists below a zone; the two documents were
divided along that seam on 2026-10-10, so a reader arriving at either question lands on the one
that holds it. Do
not name a type, key or component “spot” until the questionnaire is answered. The three throwaway
readings behind `npm run prototype:community-map` (2026-10-10) deliberately disagree about this
very question — a mark on the map, a place inside a zone, a card carrying the sharer — and they
settle nothing: prototype code is paper, never a term (PROJECT.md “Recorded requirement” §4).

**The app's copy says “report” where the domain says Feedback.** The design's frames use
it consistently (frame 06's card, frame 07's “Trusted report · 38 min ago” and “11 reports
this week”), so the catalogue keeps the design's own word: that is user-facing copy, which
is the design's to choose. `Feedback` stays the domain term and no code names a type,
variable or function “report”; if the design's wording ever changes, this note goes with it.

**Nothing here describes the weather or the report stream yet.** Frames 06, 07 and 08 talk about
the season demo, “today's outlook” and “11 reports this week”, and none of that has a domain term
because none of it has a source: there is no weather service, no zone service and no report
stream. The **Season summary** above is the design's sample for the same reason, and the figures
on frame 11's card are the design's own month rather than the picker's; only the **Visit history**
is the picker's own data today. Define the terms when the things they name exist.
