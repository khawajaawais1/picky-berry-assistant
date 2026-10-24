# ADR-055 — Retention and processors: twelve months, thirty-day backups, ninety-day crash reports, EU only

- **Status:** Accepted (2026-10-23)
- **Date:** 2026-10-23
- **Deciders:** Project owner, on 2026-10-23.
- **Supersedes:** [ADR-014](ADR-014-retention-policy.md) (the retention policy and the three items
  it left open). The twelve-month window is **restated unchanged**; what is new is everything the
  old ADR deferred.
- **Answers:** [ADR-010](ADR-010-position-retention.md) decision 4 (the policy its position fields
  inherit) and [ADR-047](ADR-047-the-consent-says-what-the-app-does.md) §2.4–§2.5 (the lawful basis
  for a fix, and what may be kept).
- **Relates to:** [ADR-054](ADR-054-the-account-belongs-to-the-api.md) (the account record this
  policy covers), [ADR-031](ADR-031-a-real-basemap-osm-derived-tiles-we-host.md) (the tile host adds
  no processor), [ADR-040](ADR-040-the-copy-the-app-owes-is-a-document.md) (the export the app
  already owes).

## Context

ADR-014 fixed the window at twelve months and left three things open: backup lifetime, whether
media and visits diverge, and which jurisdictions apply. Governance left more: the lawful basis
per purpose (PROJECT.md open question 15), the processor list, region and DPAs (16), the
data-subject rights the server owes (17), and whether a DPIA screening is needed before GPS capture
(15, and SECURITY.md §16).

Meanwhile three documents disagreed. The team's [privacy record](../../../docs/privacy.md) draft
kept visits and reports **three years** and photos one, stored a **password hash**, and described
background-location consent. ADR-014 said twelve months; ADR-054 says no password reaches our
database; [ADR-056](ADR-056-background-capture-is-out-of-scope.md) closes background capture. A
retention policy that three documents state three ways is not a policy — it is a question nobody
can answer from the record.

This ADR is the one answer. It is written before the API exists, on purpose: the windows and the
processor list shape the schema, the logs and the Sentry integration, and retrofitting them after
real data lands is how retention policies become aspirational.

## Decision

### 1 · What is kept, why, and for how long

| Data | Purpose | Lawful basis | Where | Retention |
| --- | --- | --- | --- | --- |
| Account: identifier, locale, the session's name | The service | Contract, Art. 6(1)(b) | API PostgreSQL, EU | Account lifetime; deleted with the account |
| Consent records (purpose, version, time) | Proving consent | Legal obligation, Art. 6(1)(c) | API PostgreSQL, EU | Account lifetime; deleted with the account |
| Visits, presence segments, per-segment centroid | Scores, history, verification | Consent, Art. 6(1)(a), separate from the terms | API PostgreSQL, EU | **12 months** from creation, then deleted or irreversibly de-identified |
| Reports and evidence media | The picker's own record, scores | Contract, Art. 6(1)(b) | API PostgreSQL + object storage, EU | **12 months** |
| Trust and yield aggregates, counts, bands | Scores that outlive inputs | Legitimate interest, Art. 6(1)(f) | API PostgreSQL, EU | No personal data; may be kept beyond the window |
| FCM device token | Push alerts | Consent, Art. 6(1)(a) | API PostgreSQL + Firebase | Until sign-out or deletion |
| Crash reports | Security and reliability | Legitimate interest, Art. 6(1)(f) | Sentry, EU | **90 days** |
| Server logs | Security and debugging | Legitimate interest, Art. 6(1)(f) | API host, EU | **30 days** |
| Backups | Recovery | Operation of the service | API host, EU | **30 days maximum** |

2. **The twelve-month window is unchanged**, and applies from a record's creation, not its last
   touch: a visit does not renew itself by being read. Shortening a window is safe at any time;
   **lengthening one needs a new ADR**, because it is a promise to every user already in the data.
3. **Raw position is never stored** (ADR-010 decision 2). The policy covers the derived centroid,
   the zone and the timings — not a trace, which no table may ever hold.
4. **Aggregates may outlive their inputs only if they contain no personal data and no
   reconstructed location.** A score that needs a deleted record to be recomputed is a bug, as
   ADR-014 already said.
5. **Backups: 30 days maximum**, encrypted at rest, in the EU, restorable only into the same
   environment. A record's effective life is therefore its window **plus at most 30 days**, and
   that is the number the privacy notice states. A restore older than 30 days must be impossible,
   not merely unlikely.
6. **Crash reports: 90 days in Sentry's EU region.** No position, no email address, no token, no
   name; the user id is a pseudonymous hash of the account id; attachments upload off; a
   `beforeSend` scrub drops anything position-shaped. The integration ships with a test asserting
   a coordinate-bearing payload is stripped before it leaves the app.
7. **Server logs: 30 days**, with no coordinates, no tokens and no request bodies carrying
   personal data. "No passwords, tokens or coordinates in logs" is the team checklist's own rule;
   this makes the log window part of it.
8. **Processors: EU only, each with a DPA.** Google Ireland (Firebase Authentication and Messaging,
   EU region), Sentry GmbH (Frankfurt), and the API's host, **chosen in
   [ADR-033](ADR-033-the-first-backend-slices-deployment-decisions.md)** and required to be inside
   the EEA. The tile host is the project's own storage and adds no processor (ADR-031). **A new
   processor needs an entry here and a DPA before any code sends it data** (AGENTS.md §11.1).
9. **Lawful basis per purpose is the table's**, with two consequences: tracking consent is
   separate from accepting the terms and withdrawable on its own
   ([ADR-020](ADR-020-record-consent-on-device.md), ADR-047 §1), and the legitimate-interest rows
   carry a recorded balancing test in the privacy record — the interest is stated, the necessity
   argued, and the user's objection path named.
10. **Data-subject rights the server owes, before a beta holds real data**: `POST /me/export`
    (machine-readable, within 30 days), `DELETE /me` (immediate, spanning provider and our rows,
    plus the backup path stated), rectification of the account's own fields, and restriction — the
    last of which needs a column and an answer, not just an endpoint. The device-side export
    already exists (ADR-040) and stays.
11. **Enforcement**: a scheduled purge job in the API with the windows above as constants, a test
    that fails if the job's constants drift from this ADR, and nightly backups with a restore
    test once per sprint. **No production data before 10 and 11 exist.**
12. **Nothing here is granted by this ADR alone.** The DPIA screening (PROJECT.md question 15,
    SECURITY.md §16), the age policy (question 18) and the accessibility question (19) remain the
    owner's; this ADR makes the retention and processor side answerable, not the whole compliance
    story.

## Alternatives considered

1. **Keep ADR-014 and leave the open items open.** Rejected: three documents already state three
   windows, and the first real table would have to guess which one.
2. **Six months for visits.** Less exposure, but the product's season comparison (spring to
   autumn) would lose the spring half, and no requirement asks for the cut. Rejected; shortening
   stays available without a new ADR.
3. **Twenty-four to thirty-six months.** More history, more personal data, for a benefit nothing
   in the demo shows. Rejected, as ADR-014 rejected it.
4. **No third-party crash reporting.** Strongest privacy position, and the demo loses the one
   signal that tells the team the app broke on a real phone. Rejected: 90 days, EU, scrubbed and
   pseudonymous is proportionate to a reliability signal.
5. **US-hosted Sentry or Firebase project.** Cheapest to set up and outside the EEA. Rejected: it
   would need a transfer mechanism this team has no basis to claim.
6. **Per-entity windows now** (media shorter than visits). Deferred, as ADR-014 deferred it: no
   usage data yet to justify the extra configuration, and the table above is one statement to
   change when there is.

## Consequences

- **The team's privacy record is corrected, not duplicated**: `docs/privacy.md`'s three-year
  windows become twelve months, its password hash becomes none, its background-consent row
  becomes foreground tracking, and its processors gain Sentry's 90 days and the 30-day backups.
- **The schema is shaped by this ADR**: every table with personal data carries `created_at` and a
  deletion path; no table carries a track; the export excludes what the window has already
  deleted.
- **Sentry is unblocked** (ticket F11) and constrained: DSN in `config/env.ts`, EU project,
  scrub-and-test before it ships.
- **The privacy notice has its numbers**: 12 months, +30 days backups, 90 days crash reports,
  30 days logs, EU. The notice itself is still owed, and this ADR does not write it.
- **A deletion that spans two systems is a retried job, not a request.** The provider half can
  fail after our half succeeds; the account is marked deleting until both are gone
  (ADR-054 decision 7).

## Related

- ADR-014 (superseded), ADR-010 (position retention), ADR-047 §2.4–2.5 (answered), ADR-054
  (the account), ADR-056 (no background capture), ADR-040 (device export), ADR-033 (the host whose
  region this requires)
- SECURITY.md §10, §11, §16; AGENTS.md §11.1; PROJECT.md questions 15–17
