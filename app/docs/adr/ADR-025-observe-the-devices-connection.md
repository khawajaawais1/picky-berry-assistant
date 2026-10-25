# ADR-025 — The app observes the device's connection, and states only what the device reports

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Project owner (asked to finish the frames' remaining parts; the rule below is this repository's)

## Context

Frame 13 (node `5:23530`) opens with a status message — “You're offline · Keep picking. Visits and
reports are saved on your phone.” — and frame 10 (node `5:23259`) carries the same claim in its
offline note. Both were left out of the built screens, with PROJECT.md recording why: the app had
**nothing that could observe the connection**, and a screen may not state a fact about the device
it cannot see (AGENTS.md §2.3, §11.2). Drawing the sentence unconditionally would have told a
picker on a working connection that they were offline.

The repository ships an offline-first capture flow (ADR-005) whose whole premise is that the
connection may be absent, so “is there a connection?” is a question the app legitimately has — the
frame just asks it out loud. `expo-network` is the Expo-managed module that answers it
(`useNetworkState()`, backed by the platform's own connectivity APIs), and it is bundled in Expo
Go, so it needs no development build.

## Decision

1. **The app reads the device's network state** through `expo-network`'s `useNetworkState()`, added
   with `npx expo install` so the version matches the SDK. No third-party library is used for it.
2. **The state is read to draw a sentence, and forgotten.** Nothing about the connection is stored,
   logged or sent; the value never leaves the component that renders it.
3. **The platform's report is translated by one pure, tested rule** (`connectionState`,
   `src/features/offline/domain/connection.ts`) into three answers: `offline` (no connection, or a
   connection with no reachable internet behind it), `online`, and **`unknown`** — the answer while
   the platform has not said, or has said only half of it. `unknown` is never guessed into either
   direction: a wrong “offline” tells the picker to expect a delay that is not there, and a wrong
   “online” is a claim about a device the app cannot see.
4. **The frame's sentence is drawn exactly when it is true.** Frame 13 shows “You're offline” when
   the rule answers `offline`, and nothing when it answers `online` or `unknown`. The frame's other
   claims about the connection (its downloaded region, cached tiles, storage meter, retry action and
   last-sync line) stay absent: they are about a cache and a transport that do not exist, and an
   observed connection does not make them real.

## Alternatives considered

- **Keep drawing nothing.** Correct until the app can see the connection, and the state before this
  decision — but it leaves the frame's first element unbuilt while the answer is one dependency
  away.
- **Draw the frame's sentence unconditionally.** What the frame literally draws, and what the app
  did not: it asserts a fact about the device that is false on a working connection.
- **Assume offline because the app has no transport.** True today by accident, not by observation,
  and it would silently become a lie on the day a transport ships.
- **`@react-native-community/netinfo`.** A wider API (connection quality, listeners), and the pinned
  choice for React Native generally. Rejected: `expo-network` is the Expo-managed module for
  exactly this question, so the SDK compatibility is resolved by `expo install` (AGENTS.md §10),
  and nothing here needs connection quality.
- **Poll the network on a timer instead of subscribing.** More code and more battery for the same
  answer; the hook already re-renders when the platform's state changes.
- **Store the last known state** so a screen opened offline can say so immediately. Rejected: it is
  a stored fact about the user's surroundings that no feature needs, and a stale “offline” is the
  same false claim in the other direction.

## Consequences

- Frame 13's status message is now a claim the app can stand behind, and the test suite asserts both
  directions: it is drawn when the device reports no reachable connection, and never when the
  platform is silent or the connection is up.
- One Expo-managed dependency is added (`expo-network`), and `jest.setup.ts` mocks the hook's
  native module with “the platform has not said”, so every screen renders in tests without a
  network and no test can accidentally depend on one.
- The rule is reusable by any screen that makes the same claim, without a second interpretation of
  “offline” in the app. Frame 10's offline note is the nearest candidate, and it waits on an owner
  decision rather than on code: its title is the frame's own name for the *save path* (its button
  says “Save report offline” too) and is drawn on a working connection as well, so making it
  conditional needs the wording that replaces it when the device is connected (PROJECT.md, known
  issue 18).
- Frame 13 remains **built in part**: the connection is observable, but the tile cache, the storage
  measurement, the transport and the downloaded-region store the frame draws are not, and
  PROJECT.md still records each.
