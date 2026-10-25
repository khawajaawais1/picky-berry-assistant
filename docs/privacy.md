# Privacy and GDPR — records of processing

Owners: Hassan (backend), Salman (app), Sayeem (process). Based on architecture doc §13.
Location history is sensitive personal data; the core rule is architectural:
**raw GPS tracks never leave the phone — the server only knows zone + duration.**

The windows, processors and lawful bases below are decided in the app's ADRs —
[ADR-055](../app/docs/adr/ADR-055-retention-and-processors.md) (retention, processors, bases) and
[ADR-054](../app/docs/adr/ADR-054-the-account-belongs-to-the-api.md) (identity). Where this table
and those ADRs differ, the ADRs win; changing a number here means changing them.

**Status today (2026-10-24): the app is the only part that handles any of this, and it sends
nothing.** What exists is on the device: the consent record, saved zones, the report queue and the
stand-in session. No account, visit, report, photo, token or coordinate is stored anywhere else,
and there is no backend, bucket, Sentry project or push sender. So every **Where stored** cell in
the table below says where the record **will** live once the service exists, not a place that holds
it now. The one exception is the optional Firebase password-reset request: when
`EXPO_PUBLIC_FIREBASE_API_KEY` is configured, the address the picker types is sent to Identity
Toolkit to ask for a reset link, and no reset token is kept ([ADR-062](../app/docs/adr/ADR-062-password-reset-belongs-to-the-provider.md)). The checklist under the table is therefore the state of the
service as a whole — nearly all of it is still to do, and the foreground consent it names is the
part the app already records and states on the device
([ADR-020](../app/docs/adr/ADR-020-record-consent-on-device.md)).

## Records of processing

| Data | Purpose | Lawful basis | Where stored | Retention | Feature |
|------|---------|--------------|--------------|-----------|---------|
| Email | Account | Contract | Postgres (EU) | Account lifetime; deleted with the account | 6.1 |
| Password | Credential | — (not our data) | Firebase Authentication, EU; **no password or hash in our database** (ADR-054) | Until deletion at the provider | 6.1 |
| Locale, the session's name, consent timestamps | Account | Contract | Postgres (EU) | Account lifetime | 6.1 |
| Consents (terms version, tracking consent) | Proof of consent | Legal obligation | Postgres (EU) + device (ADR-020) | Account lifetime | 6.1 |
| Visits (zone, start, end), presence segments, one coarse centroid | Scores, history, verification | Consent for tracking, separate from the terms; contract for the visit's own record | Postgres (EU) | **12 months**, then deleted or de-identified | 6.3 |
| Reports (rating, amount) | Scores, trust | Contract | Postgres (EU) | **12 months** | 6.4, 6.5 |
| Photos (EXIF GPS stripped) | Berry detection, trust | Contract | Object storage (EU) | **12 months**; aggregates kept | 6.4 |
| Trust and yield aggregates | Scores without raw inputs | Legitimate interest | Postgres (EU) | No personal data; may outlive the window | 6.5 |
| FCM device token | Push alerts | Consent | Postgres + Firebase | Until logout/deletion | 6.7 |
| Refresh tokens | Sessions | Contract | Firebase; no session row in our database | Until sign-out | 6.1 |
| Crash reports | Reliability, security | Legitimate interest | Sentry, Frankfurt (EU) | **90 days**; no position, email or token | — |
| Server logs | Security, debugging | Legitimate interest | API host (EU) | **30 days**; no coordinates, tokens or personal bodies | — |
| Backups | Recovery | Operation of the service | API host (EU) | **30 days maximum** | — |

Not collected in v1: background location (ADR-056), and therefore no background track, foreground
service or “Always” permission. Visit tracking is read only while a screen is open, with the
picker's own consent, and a derived visit is all that is kept.

## MVP checklist
- [ ] Privacy notice FI + EN in the app and on a web page, stating 12 months + 30-day backups
- [ ] Consent for visit tracking (foreground) and push, separate from account terms
- [ ] Data minimisation: zone + duration instead of tracks; nickname instead of real name
- [ ] Export (`POST /me/export`), delete (`DELETE /me`), change privacy level any time
- [ ] Nightly `purge_personal_data` enforces the 12-month window; backups expire within 30 days
- [ ] Sentry: EU project, 90-day retention, scrub test that drops coordinates and tokens
- [ ] No passwords, tokens or coordinates in logs
- [ ] Test users sign a short consent form before user tests
- [ ] Ask JYU whether the course project needs its own data-protection review
