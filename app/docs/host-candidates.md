# Where the first backend slice could run — candidates for the owner to approve

**Status:** a comparison, written 2026-10-11. **Nothing here is adopted, no account exists, and no
credential has been created.** Every candidate is a *processor*, and choosing one is the owner's
answer to PROJECT.md questions 3, 5, 15 and 16 — which is why this document ends with a form rather
than a decision.

**For:** the project owner. **From:** the mobile team, which can narrow the field and cannot pick
from it (AGENTS.md §11.1: no new processor, and no transfer outside the EEA, without an owner
decision).

**Where the answers land:** the slots in
[ADR-033](adr/ADR-033-the-first-backend-slices-deployment-decisions.md) §1.1 (which host and whether
the shape is adopted), §1.2 (which repository, who writes it), §1.3 (who operates it), §2.1 (which EU
region, and what leaves it) and §2.2 (which processors, whose DPAs). It is the expanded version of
[to-questionnaire-backend.md](../to-questionnaire-backend.md) §1–§2, which is the shorter document the
owner was already sent — answering either one answers both.

## 1. What the slice actually needs

Small, but not trivial. From [ADR-032](adr/ADR-032-the-first-backend-slice.md) and
[docs/api-contract.md](api-contract.md):

| Need | Size, honestly |
| --- | --- |
| A Postgres database | Two tables, a few columns, **kilobytes** of data at this stage. No analytics, no full-text, no GIS |
| A place to run the API | Five endpoints, one container or function, a few hundred requests a day at best |
| **A scheduled job** | The 12-month deletion job (`expires_at` + redemptions) must run monthly without a server being awake (ADR-014, contract §4) |
| Token verification | Fetch and cache the identity provider's JWKS, verify signature/issuer/audience/expiry (ADR-013) |
| Rate limiting | Required before public, per account and per address (contract §6) |
| **An always-answering service** | A share must be redeemable after a week of nobody using the app. A host that *pauses when idle* is a host that breaks the slice's only feature |
| Region | EU, and nothing outside it without the owner saying so (question 16) |
| Costs | Free, or a few euros a month — this is a pre-revenue project with no budget line |

Two needs in that table do the real filtering: **the scheduled job** (many "serverless function"
products cannot run one) and **the idle problem** (a free tier that pauses the database makes the
feature unreliable in exactly the situation the slice is built for — a link someone opens days later).

## 2. The four shapes, which is the real choice

The provider question is really a question about **how many processors, and where they are**:

- **A · One EU provider for both halves.** Database and API with the same EU-headquartered company.
  No third-country transfer to analyse, one DPA, one region. Costs money from the first day (no free
  tier for the database) and the tooling is less fashionable.
- **B · One US provider with a free tier for both halves.** A Postgres *and* a function runtime in one
  account, one DPA with a US company (SCCs needed), free at this size. Two flavours, and they differ
  on the point that matters: **Neon** now runs Functions and Object Storage in the same region as the
  database — Frankfurt is one of the four its docs list — with scale-to-zero rather than a shutdown;
  **Supabase** pauses a free project after a week of inactivity and distributes its edge functions
  globally, so its EU region covers the *data* and not necessarily the *compute or logs*.
- **C · Two providers: a free-tier Postgres plus a separate compute host.** Cheapest in money, most
  expensive in decisions: two processors, two regions to record, two DPAs, and a network hop between
  them. Each half can be swapped later, which is the compensating advantage.
- **D · Stay inside the processor we already have (Google).** Firebase Authentication is already a
  processor (ADR-013), so an API on Cloud Run with Cloud SQL in an EU region adds **no new processor
  relationship** — the smallest possible answer to question 16. It is also the heaviest to operate and
  the least free of the four.

Nothing below is a recommendation to *start building*: whichever shape is approved, the code lives
outside this repository (ADR-015), no secret enters the app (AGENTS.md §5), and the app still sends
nothing until a transport is built (SECURITY.md §17).

## 3. Database candidates — managed Postgres in the EU

| Candidate | EU region | Free / entry cost | Verification |
| --- | --- | --- | --- |
| **Scaleway** (Fr, EU) | Paris (PAR1/2), Amsterdam (AMS1/2), Warsaw (WAW1/2) | No free tier; **from €4.99/month** for the smallest managed instance (the vendor's own product and pricing pages, quoted via search — its pricing page exceeds this tool's fetch limit) | Regions and DPA from Scaleway's own pages, read 2026-10-11; price quoted, not machine-read |
| **Supabase** (US/SG) | "Central EU (Frankfurt)" general region, or a specific region (`eu-central-1`, `eu-west-1/2/3`, `eu-north-1`, `eu-central-2`) | **Free:** 500 MB database, shared CPU, 2 active projects — **paused after 1 week of inactivity**; Pro from $25/mo (includes $10 compute) | Pricing and region pages read 2026-10-11 |
| **Neon** (US, Databricks-owned) | **AWS Europe (Frankfurt) `aws-eu-central-1`**, AWS Europe (London) `aws-eu-west-2`; region fixed when the project is created. **Functions and Object Storage also run in Frankfurt** (AI Gateway needs a paid plan) | **Free:** 100 CU-hours **per project** per month, 1 GB storage per project, up to 100 projects; compute scales to zero after 5 minutes idle; Launch ≈ $15/mo typical | Regions and product availability read 2026-10-11; pricing page read 2026-10-11 |
| **Tiger Cloud** (Tiger Data / Timescale, US) | EU region selectable at provisioning (console page did not enumerate regions) | **A free plan does exist** — the vendor's changelog and docs: "No cost, no trial, just free", up to two free services, 750 MB each. But a third-party review reports the free services are **limited to shared compute, 750 MB and `us-east-1`, and still in beta** — which for us means a free service is not an EU one | Free plan confirmed from the vendor's own changelog; the **us-east-1 limitation is third-party and unconfirmed — ask the vendor before counting on it** |
| **Google Cloud SQL** (US) | `europe-west1`/`europe-north1` and others | **30-day free trial instance**, one per *new* project, billing must be enabled; after that a small shared-core instance is paid (no always-free Cloud SQL tier); new customers also get $300/90 days | Free-trial page read 2026-10-11 |

**What the table cannot tell the owner.** Whether a US-headquartered processor (Neon/Databricks,
Supabase, Tiger Data, Google) is acceptable at all is a transfer question — SCCs, the CLOUD Act, and
who signs the privacy notice — and that reading is not this repository's (question 15/16). The
EU-headquartered option removes the question rather than answering it, at a price. The country shown
for each candidate is where the company is established, not which legal entity would sign: that is
part of the transfer analysis and is confirmed at signature time.

The identity provider is already Google (ADR-013). Using a US-based database does not remove Google
from the picture; using Cloud SQL adds no *new* relationship.

## 4. Compute candidates — where the API runs

| Candidate | Free tier | Runs where | Scheduled job | Notes |
| --- | --- | --- | --- | --- |
| **Scaleway Serverless Functions** (EU) | 1,000,000 requests/month per account, then €0.15 per 1M (vendor pages, quoted not machine-read) | EU regions (Paris, Amsterdam, Warsaw) | Yes (Serverless Jobs / cron triggers; also a trigger for the deletion job) | Same account, region and DPA as a Scaleway database → **shape A**, one processor |
| **Cloudflare Workers** | **100,000 requests/day, 10 ms CPU per invocation** (read 2026-10-11); Paid **$5/mo minimum** for more, plus queues/Durable Objects | Cloudflare's global network — the request is handled where it lands; **EU-only processing of logs/metadata needs the Data Localization Suite, which is an Enterprise-only paid add-on** (read 2026-10-11) | Yes (Cron Triggers, up to 15 min CPU per invocation) | Excellent free tier and TS-native; the residency caveat is real for a GDPR posture, and it pairs with a *separate* database → shape C |
| **Supabase Edge Functions** | Included with the project (free plan included) | Deno runtime, "globally distributed at the edge — closest to the user"; the gateway records request metadata | Not as the product's own scheduler — the deletion job would have to be driven from the database side; **confirm what the provider supports before approving** | Same account and DPA as the database → shape B, one processor; the EU database does **not** pin the compute |
| **Google Cloud Run** | Free monthly grant (CPU/RAM seconds; **figures taken from Google's pricing page as quoted in search results, not machine-read — confirm**); request-based billing | Choose `europe-west1`/`europe-north1` explicitly | Yes — a Cloud Run **job** "executes parallelizable tasks … manually, or on a schedule" (docs read 2026-10-11) | Best fit if shape D is chosen: same processor as Firebase, EU region, real cron |
| **Vercel** | Hobby is free, but **"restricts users to non-commercial, personal use only"** (read 2026-10-11) → a commercial app needs Pro (its price was not verified in this pass) | Functions run in the region chosen (e.g. `fra1`) | Yes (Cron Jobs on Pro) | The Hobby terms, not the technology, are the blocker |

Two findings worth the owner's attention: the **commercial-use restriction** on Vercel's free tier,
and Cloudflare's **Enterprise-only data-localization add-on** — both mean "free" and "EU-resident"
are not the same claim for those hosts.

## 5. Recommendation from the mobile team

**Recommended — shape A, Scaleway, if the owner accepts a small monthly bill.** One EU-headquartered
processor, both halves in Paris, one DPA, no third-country transfer to analyse, a real scheduled job,
and a region story that needs no lawyer. Cost is the whole objection: there is no free database tier,
and the smallest managed instance is **€4.99/month** on the vendor's own pages, plus serverless
function usage (which carries a 1M-request monthly free tier) — a few euros a month, not zero,
confirmable at the URL in the Sources table below.

**Zero-cost alternative — shape C, Neon free + Cloudflare Workers free.** Both have genuinely free
tiers that cover this slice several times over, and both are documented as EU-capable. The price is
paid in decisions rather than invoices: two US processors and two DPAs, a cross-provider hop, Neon's
5-minute scale-to-zero cold start on the first request after quiet hours, and Cloudflare's logs
outside the EU unless the Enterprise add-on is bought. Approved only with those four named as accepted.

**Fewest-new-processors alternative — shape D, Cloud Run + Cloud SQL in an EU region.** The identity
provider is already Google, so question 16 grows by nothing new; Cloud Run has a real free tier and a
scheduler. It is the heaviest to operate and the least free of the four once the Cloud SQL trial ends.

**Not recommended as the deployment of record:** *Supabase free* for the database (a project that
pauses after a week of inactivity fails the slice's one feature — Pro at $25/mo fixes it, which is
what the recommendation would become if the owner prefers the Supabase tooling), and *Tiger Cloud
free* (its free services are reported as `us-east-1`-only and in beta, which breaks the EU-region
requirement; a paid Tiger EU region is the only usable Tiger option, and the others do it cheaper).

## 6. What approval means

The owner writes into ADR-033 §1.1/§1.2/§1.3, §2.1 and §2.2:

- **Shape:** A / B / C / D — or "not yet", which is a valid answer and keeps the deployment blocked.
- **Database provider and region string** (e.g. `fr-par` / `eu-central-1`).
- **Compute host and region** (may be the same provider).
- **Processors added, and who signs each DPA** (one line per provider; Google is already on the list
  via ADR-013).
- **Who operates it day to day**, who holds the credentials, and how they rotate (question 3) —
  including "nobody yet", which is a recorded risk rather than a blocker removed.
- **Where the server code lives** (ADR-015 keeps it out of this repository).

Then, and only then: an account is created, the DPA is signed, the region is written into
question 16, the privacy notice grows a line per processor, and the API is built in its own
repository against [the contract](api-contract.md). Until then this document changes nothing: no
account exists, no key is held, no processor is added, and the app still sends nothing.

## 7. What this document does not establish

- **Prices and free-tier limits are quoted as read on 2026-10-11** from the vendors' own pages, and
  they change without notice. The rows marked *not verified* are exactly that.
- **It is not a transfer analysis.** SCCs, the CLOUD Act and third-country exposure are legal
  readings owed with the privacy notice (question 15) and the region decision (question 16).
- **A free tier is not an SLA.** None of the free tiers here carries an uptime commitment; the slice's
  first real users would be on one anyway, which is a deliberate choice rather than an oversight.
- **Free tiers move, and two carry shutdown or deletion terms.** Supabase pauses a free project after
  a week of inactivity; Neon's own docs say Free-plan projects in the (deprecated) Azure regions that
  are inactive for 90 days or more are subject to deletion, and that a project's region cannot be
  changed once created; Tiger's free services are reported as beta and `us-east-1`-only. None of that
  rules a free tier out for a slice nobody depends on yet — it does rule out putting data you cannot
  lose there without a paid plan behind it.
- **It does not compare self-hosting** (a Postgres and a container on a VPS): cheaper still, and it
  moves patching, backups, TLS and the DPA-with-whom question onto this team. Out of scope until the
  owner says otherwise.

## Sources read in this pass (2026-10-11)

| Claim | Source | How |
| --- | --- | --- |
| Workers free plan: 100,000 requests/day, 10 ms CPU; Paid $5/mo minimum | <https://developers.cloudflare.com/workers/platform/pricing/> | Read |
| Data Localization Suite is an Enterprise-only paid add-on | <https://developers.cloudflare.com/data-localization/> | Read |
| Supabase free: 500 MB, 2 active projects, paused after 1 week; Pro from $25/mo | <https://supabase.com/pricing> | Read |
| Supabase regions (general + specific EU) and "region selection is a data-location control, not proof of regulatory compliance" | <https://supabase.com/docs/guides/platform/regions> | Read |
| Supabase Edge Functions: Deno, globally distributed at the edge, gateway records request metadata | <https://supabase.com/docs/guides/functions> | Read |
| Neon free plan: 100 CU-hours per project/month, 1 GB per project, scale-to-zero after 5 minutes | <https://neon.com/pricing> | Read |
| Neon regions: AWS Frankfurt `aws-eu-central-1` and London; Functions and Object Storage available in Frankfurt; region fixed at project creation | <https://neon.com/docs/introduction/regions> | Read |
| Neon's parent: Databricks agreed to acquire Neon (May 2025) | <https://www.databricks.com/company/newsroom/press-releases/databricks-agrees-acquire-neon-help-developers-deliver-ai-systems> | Not machine-read |
| Vercel Hobby: free, non-commercial use only | <https://vercel.com/docs/plans/hobby> | Read |
| Cloud SQL: 30-day free trial instance, one per new project, billing required | <https://docs.cloud.google.com/sql/docs/postgres/free-trial-instance> | Read |
| Cloud Run: services, jobs ("manually, or on a schedule"), worker pools | <https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run> | Read |
| Tiger Cloud free plan: "No cost, no trial, just free", up to two free services | <https://www.tigerdata.com/docs/get-started/news/new> | Quoted, not machine-read |
| Scaleway managed database: "starting at €4.99/month" | <https://www.scaleway.com/en/managed-postgresql-mysql/> | Quoted, not machine-read |
| Scaleway: SAS registered in Paris; service data processed under its DPA | <https://www.scaleway.com/en/privacy-policy/> | Read |
| Scaleway regions Paris/Amsterdam/Warsaw | <https://www.scaleway.com/en/product-availability-by-region/> | Quoted, not machine-read |
| Scaleway Serverless Functions: 1M requests/month free, then €0.15 per 1M | <https://www.scaleway.com/en/pricing/serverless/> · <https://www.scaleway.com/en/docs/serverless-functions/faq/> | Quoted, not machine-read |
| Tiger Cloud: "Start a free trial"; 99.9% SLA (Enterprise) | <https://www.tigerdata.com/cloud> | Read |

The service catalog that surfaced the first candidate
([Tiger Cloud](https://www.tigerdata.com/cloud), free plan: up to 2 services, 750 MB each) is the
Gravity Index; it lists no serverless function host, which is why the compute half is researched from
vendor pages rather than from the catalog.
