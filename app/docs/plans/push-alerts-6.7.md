# Push alerts (feature 6.7) — mobile integration

**Full feature spec:** [`../../../docs/features/6.7-reasoning-push-alerts.md`](../../../docs/features/6.7-reasoning-push-alerts.md)
**Backend status (2026-11-22):** deployed on Render — `https://picky-backend-cd0u.onrender.com`
**Mobile work remaining:** one deep-link handler (details below).

## What's already built on the mobile side

- `expo-notifications` installed and permissions handled on launch
- FCM token registration via `POST /me/devices` on sign-in and on token refresh
- Alerts inbox screen (design sample — reads `/api/v1/alerts` for the authoritative list)

## What's left to build

A single notification-tap handler that reads `zoneId` from the FCM payload and navigates
to that zone's detail card in the Discover screen.

### FCM payload the backend sends

Notification (what the OS shows):
```
Title: Berry alert: Bilberry
Body:  Ripe bilberry in zone Ukonvuori 4 — yield score 82, medium confidence.
```

Data payload (hidden fields the app reads on tap):
```json
{
  "ruleId":     "ripe_nearby",
  "species":    "bilberry",
  "zoneId":     "082f0e54-03f4-5636-be4a-3f39d243a696",
  "score":      "82",
  "confidence": "medium"
}
```
All values are strings (FCM data limitation). `zoneId` is the only one you need for the
deep-link; the others are optional context.

### Implementation sketch

```ts
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data as {
    zoneId?: string;
    species?: string;
  };
  if (data.zoneId) {
    // Navigate to the zone card in the Discover feature.
    // Reuse whichever navigation helper already opens a zone card from the map.
    navigateToZoneCard(data.zoneId, data.species);
  }
});
```

Wire the listener once in the app's root layout (not per screen) so it fires regardless of
what's currently visible when the push is tapped. Handle both cold start (app launched by
the push) and warm start (app resumed from background) with
`Notifications.getLastNotificationResponseAsync()`.

### Testing without Firebase (interim)

Firebase credential isn't set in Render yet, so no real push arrives on the device today.
You can still verify the navigation path by taking a `zoneId` from the live alerts endpoint
and triggering the handler manually in dev:

```bash
curl -X POST "https://picky-backend-cd0u.onrender.com/api/v1/reasoning/run?as_of=2026-08-15"
sleep 10
curl https://picky-backend-cd0u.onrender.com/api/v1/alerts | jq '.[0].zoneId'
```

Use that UUID in your local dev build to confirm the zone card opens correctly.

### What NOT to do

- Do not re-query the backend for the alert on tap — the push carries everything needed.
- Do not apply throttle/filter logic on the device — the backend has already enforced
  score ≥ 70, confidence ≠ low, quiet hours, 2/day rate limit, 3-day zone cooldown.
- Do not persist push payload as a permanent record — the inbox reads `/api/v1/alerts`
  for the authoritative list.

## When FCM goes live

Awais sets `FIREBASE_CREDENTIAL_JSON` in the Render dashboard → the daily 06:00 Helsinki
cron starts sending real pushes to any device whose token is in the `devices` table.
Nothing else changes on the backend. Your tap handler is the last piece.
