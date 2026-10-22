# Privacy and GDPR — records of processing

Owners: Hassan (backend), Salman (app), Sayeem (process). Based on architecture doc §13.
Location history is sensitive personal data; the core rule is architectural:
**raw GPS tracks never leave the phone — the server only knows zone + duration.**

## Records of processing (fill in during sprint 2–3)

| Data | Purpose | Lawful basis | Where stored | Retention | Feature |
|------|---------|--------------|--------------|-----------|---------|
| Email, password hash, nickname | Account | Contract | Postgres (EU) | Until deletion | 6.1 |
| Consents (terms, privacy version, background location) | Proof of consent | Legal obligation | Postgres | Account lifetime | 6.1 |
| Visits (zone, start, end) | Scores, analytics | Consent (background location) | Postgres | 3 years, anonymised on deletion | 6.3 |
| Reports (rating, amount) | Scores, trust | Contract | Postgres | 3 years, anonymised on deletion | 6.4, 6.5 |
| Photos (EXIF GPS stripped) | Berry detection, trust | Consent | Object storage (EU) | 1 year; detections kept | 6.4 |
| FCM device token | Push alerts | Consent | Postgres + Firebase | Until logout/deletion | 6.7 |
| Refresh tokens | Sessions | Contract | Postgres (hashed) | 30 days | 6.1 |

## MVP checklist
- [ ] Privacy notice FI + EN in the app and on a web page
- [ ] Consent for background location and push, separate from account terms
- [ ] Data minimisation: zone + duration instead of tracks; nickname instead of real name
- [ ] Export (`POST /me/export`), delete (`DELETE /me`), change privacy level any time
- [ ] Nightly `purge_personal_data` enforces retention
- [ ] No passwords, tokens or coordinates in logs
- [ ] Test users sign a short consent form before user tests
- [ ] Ask JYU whether the course project needs its own data-protection review
