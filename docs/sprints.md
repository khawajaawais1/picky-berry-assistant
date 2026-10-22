# Timeline and sprints

From the team build plan (20 Oct 2026) and the course deadlines.

| Sprint | Dates | Goal | Features |
|--------|-------|------|----------|
| 1 · Foundations | 21 Oct – 3 Nov | Everyone's first deliverable; repo, schema, app skeleton, data in DB | 6.1 start, 6.2 data + stubs |
| 2 · Core features | 4 – 17 Nov | Live map with yield score, GPS visit detection, feedback flow, trust weighting, yield model v1 | 6.2, 6.3, 6.4, 6.5, 6.6 |
| 3 · Intelligence + first extra | 18 Nov – 1 Dec | Reasoning & push alerts, analytics dashboard, offline mode, privacy settings; marketplace starts | 6.7, 6.8, 6.9, E1 |
| 4 · Test and demo | 2 – 17 Dec | User tests in Jyväskylä, bug fixing, remaining extras, cloud deployment, **final demo 17 Dec** | E2–E5 as time allows |

## First deliverables — due Tue 3 Nov

| Person | Deliverable |
|--------|-------------|
| Sayeem | GitHub repo + task board, test plan v1, HW5 report |
| Salman (Prottoy) | React Native (Expo) skeleton with a MapLibre map showing test zones |
| Hassan | DB schema + login + `POST /visits` running locally |
| Remon | WildBe downloaded + first YOLO training run with mAP |
| Awais | Weather + NDVI for Central Finland in the DB (plus zones and basemap for 6.2) |
| Asmer | Ontology v1 (species, zone, visit, report) + 3 rules as `.rq` files |
| Sabih | Figma for 5 core screens + backend Dockerfile |

**Dependencies:** Hassan's schema first (app and model store read from it; the app uses
`data/test_zones.geojson` until then). Asmer + Hassan agree species/zone names in week 1.
Awais's weather/NDVI feed Remon's yield model (Remon starts with YOLO).
Sabih shares the first 2 screens early.

## Course deadlines

| Date | Deadline |
|------|----------|
| Wed 21 Oct 2026, 18:00 | HW5 – progress report (Moodle, group Picky) |
| Weeks 49–50 (30 Nov – 13 Dec) | Thesis consultation with Prof. Vagan Terziyan |
| Thu 17 Dec 2026 | Design & implementation due — final demo |
| Thu 14 Jan 2027 | Final defense |

## Rituals
* Weekly 15-minute check-in; blockers posted in the team chat the same day.
* Each sprint ends with a demo of what runs on staging and an update of the
  [feature catalogue](features/README.md) status column.
* Restore test of the nightly backup once per sprint (Sabih).
