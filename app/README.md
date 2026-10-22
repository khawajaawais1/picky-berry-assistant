# app/ — React Native mobile app (owner: Salman / Prottoy)

Expo + TypeScript, iOS 16+ and Android 10+. Offline-first: reads from a local SQLite cache,
writes to an outbox, a sync engine talks to the API when the network is up.
Screens from Sabih's Figma. Design: architecture doc §4, feature deep dives.

## Planned layout (architecture doc §4 — create with `npx create-expo-app` in week 1)

```
app/
  app/                 # expo-router screens (file-based routes)
    (auth)/login.tsx, register.tsx                         # 6.1
    (tabs)/map.tsx, visits.tsx, alerts.tsx, profile.tsx    # 6.2, 6.3, 6.7, 6.9
    zone/[id].tsx, visit/[id]/feedback.tsx                 # 6.2, 6.4
  src/
    api/        # generated OpenAPI client + TanStack Query hooks (openapi-typescript)
    db/         # Drizzle schema, migrations, outbox
    sync/       # sync engine (push outbox, pull deltas)
    location/   # background task, geofences, visit state machine (6.3)
    map/        # MapLibre setup, offline pack manager, layers (6.2, 6.9)
    features/   # map, visits, feedback, alerts, profile
    store/      # Zustand stores
    i18n/       # fi.json, en.json
```

## Screens per feature

| Feature | Screens |
|---------|---------|
| 6.1 Accounts | Login / register, consent, language |
| 6.2 Live map | Map home, species chips, legend, zone sheet, near-me list |
| 6.3 Visits | Active visit (timer, "I'm picking", end) |
| 6.4 Feedback | Rating per species, amount, photo |
| 6.7 Alerts | Alerts inbox with reasons |
| 6.8 Analytics | My stats |
| 6.9 Offline & privacy | Profile & privacy, download offline area, export / delete data |
| E1 Marketplace (extra) | Listings, orders, chat (later) |

## Data you can use today
* `../data/test_zones.geojson` — 50 zones in the exact `GET /api/v1/zones?species=bilberry` shape.
* Basemap: `picky-data basemap --scope pilot` (ask Awais) → `pmtiles://` source.

Week 1 (D9): Expo dev build with `@maplibre/maplibre-react-native` on emulator + one Android
phone; verify `pmtiles://` on iOS and Android.
