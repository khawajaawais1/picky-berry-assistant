# Picky — mobile app (`app/`)

The Picky mobile application: a React Native (Expo) client for field workflows —
zone visits detected from GPS, feedback with media evidence, scoring, alerts.

This is the frontend of the Picky monorepo. The app lives in `app/`; the backend
([`../backend/`](../backend)), data pipelines ([`../data/`](../data)), ML
([`../ml/`](../ml)), ontology ([`../ontology/`](../ontology)) and deployment
([`../deploy/`](../deploy)) are sibling folders. Team-level rules live in
[`../CONTEXT.md`](../CONTEXT.md) and [`../CONTRIBUTING.md`](../CONTRIBUTING.md);
where an app document and those disagree, the team documents win for
project-wide facts (team, timeline, architecture, API conventions), and this
folder's ADRs win for how the app is built.

> **Status: every v1-scope design screen is built.** The verified skeleton, tooling,
> CI and documentation exist, frames 01 and 03–14 each have a screen behind a route,
> and the first real device-side flow runs end to end: walk to a zone, time the visit,
> report it, and read the report back. The app still sends nothing: the backend module
> in `../backend/` is being built in parallel, so the screens read the design's demo
> values or this phone's own records. See [PROJECT.md](PROJECT.md).

## Quick start

Run every command from this folder:

```bash
cd app
npm ci                   # install exactly the locked dependency tree
cp .env.example .env     # public client config (never secrets — SECURITY.md §9)
npm start                # then press i / a / w, or scan the QR code
```

`npm ci` also wires this clone's Git hooks through the `prepare` script: every commit is
scanned for secrets before it is created (`app/.githooks/pre-commit`, SECURITY.md §9).

## Verify

```bash
npm run verify           # format check + typecheck + lint + tests
npm run test:coverage    # the same tests, enforcing the recorded coverage floor
npm run doctor           # expo-doctor dependency/config health
npm run build:native     # export the iOS and Android JavaScript bundles
```

Current state (measured in `app/` on 2026-10-25): typecheck, lint and format are clean and Jest
passes **120 suites / 1,195 tests**; `npm run test:layout` measures every built screen in both
languages and at both text sizes, over the same screens, the app shell's destinations and the
built flow from the walk through the report to the queued row; `npm run build:native` exports
the iOS and Android bundles.

CI is [`.github/workflows/mobile.yml`](../.github/workflows/mobile.yml) at the repository
root: it runs the same gate, the Playwright layout/accessibility harness and the native bundle
exports for changes under `app/**` or the workflow on `main` and on every pull request. A
separate [`.github/workflows/secrets.yml`](../.github/workflows/secrets.yml) runs the gitleaks
secret scan over the history on every pull request and push to `main`, with no path filter.
Dependency review, CodeQL and actionlint run beside them. None of them deploys or publishes.

## Layout

```
app/                        ← npm package "picky-mobile"; all commands run here
├── src/
│   ├── app/          Expo Router routes: screens and layouts only, no logic
│   │   └── (app)/      the app shell: the nine screens the core navigation is drawn on
│   ├── components/   shared UI: atoms/ molecules/ organisms/ templates/
│   ├── config/       validated public runtime configuration (env.ts)
│   ├── constants/    design tokens (theme.ts)
│   ├── features/     feature slices; each exposes a single index.ts entry point
│   │   ├── onboarding/    screens 01, 03, 04 and 05
│   │   ├── discover/      screens 06–12, the map drawn from the design, and the saved plan's list
│   │   ├── offline/       screen 13, the sync centre the report queue is listed on
│   │   ├── privacy/       frame 14: the account row, the settings rows and sign out
│   │   └── visits/        zone containment + visit lifecycle (pure domain, tested)
│   └── hooks/        cross-feature React hooks
├── docs/                 ADRs, the API slice's contract, design source, audits
└── e2e/                  the Playwright layout and accessibility harness
```

`services/` holds what already exists (`i18n`, `privacy-consent`, `report-queue`,
`saved-zones`, `session` with its sign-out); `models/`, `state/` and `utils/` are added when
first needed.

## Data you can use today

- [`../data/test_zones.geojson`](../data/test_zones.geojson) — 50 zones around Laajavuori in
  the exact `GET /api/v1/zones?species=bilberry` shape. It is the app's mock until the
  backend serves zones.
- The app bundles that file (`assets/data/test-zones.json`) and draws it with MapLibre on the
  device, the same rings on the web export ([ADR-053](docs/adr/ADR-053-the-discover-map-is-real-geography.md)).
  MapLibre is not in Expo Go: screen 06 still opens there, but its map area says the map needs a
  development build (`npx expo run:ios` / `eas build --profile development`). There is no basemap yet
  ([ADR-031](docs/adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)); frames 08–09 still
  draw the design's map (ADR-021).

## Where the app sits in the feature catalogue

| App surface | Feature | Owner |
| --- | --- | --- |
| Sign-in, register, consent, language | 6.1 Accounts and roles | Hassan · Salman, Sabih |
| Map home, zone sheet, near-me list | 6.2 Live site map with yield score & confidence | Awais, Hassan, Salman, Remon |
| Active visit | 6.3 GPS visit detection | Salman · Hassan |
| Post-visit feedback | 6.4 Feedback (rating, amount, photo) | Hassan · Salman, Sabih, Remon |
| Scores shown in the zone sheet | 6.5 Validation and trust weighting · 6.6 Yield prediction | Hassan · Remon |
| Alerts inbox | 6.7 Reasoning and explainable push alerts | Asmer · Sabih, Hassan |
| Season summary | 6.8 Analytics | Hassan · Sayeem |
| Sync centre, privacy & data | 6.9 Offline mode and privacy | Salman · Hassan |
| Marketplace screens (disclosed demo) | E1 Marketplace (desired extra) | after core is stable |

Full catalogue, sprints and status: [`../docs/features/README.md`](../docs/features/README.md).

## Documentation

| Document | Contents |
| -------- | -------- |
| [`../CONTEXT.md`](../CONTEXT.md) | Team brief: product, people, timeline, conventions (read first) |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Branches, PRs, definition of done for the whole repo |
| [AGENTS.md](AGENTS.md) | Instructions for AI coding agents working on the app |
| [PROJECT.md](PROJECT.md) | Purpose, requirements, status, open questions |
| [CONTEXT.md](CONTEXT.md) | The app's domain glossary — terms, `_Avoid_` lists, gaps |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, layering, data flow, boundaries |
| [SECURITY.md](SECURITY.md) | Mandatory security baseline |
| [TESTING.md](TESTING.md) | Testing strategy and conventions |
| [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md) | Completion checklist |
| [CONTRIBUTING.md](CONTRIBUTING.md) | App-local workflow: commands, commits, PRs, CI |
| [docs/design-source.md](docs/design-source.md) | The Figma design inventory, screen-by-screen status, and how values are extracted |
| [docs/plans/team-mvp-plan.md](docs/plans/team-mvp-plan.md) | The team's MVP plan as it concerns the app |
| [docs/adr/](docs/adr/) | Why the app's architecture is what it is |
