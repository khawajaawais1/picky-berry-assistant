import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';

import { useDevicePosition, type DevicePositionStatus } from '@/hooks/use-device-position';
import type { PositionFix, PositionSource } from '@/services/location';

import { presenceSamplesFor } from '../domain/position-presence';
import { DEFAULT_VISIT_POLICY, type VisitPolicy } from '../domain/visit-policy';
import {
  applyPresence,
  createVisitTrackerState,
  type CandidateEntry,
  type Visit,
  type VisitEvent,
  type VisitTrackerState,
} from '../domain/visit-lifecycle';
import {
  findContainingZone,
  type ZonePolygon,
  type ZoneResolution,
} from '../domain/zone-containment';

/**
 * Where the picker is, and what that means to their visits — the whole chain, in one hook: the
 * device's fixes (through the gated seam, `use-device-position`), the zone they fall in
 * (`findContainingZone`), the samples that step produces (`presenceSamplesFor`), and the visits the
 * tracker makes of them (`applyPresence`). Nothing here reads a clock or a device: it is wiring, and
 * every rule it applies is a pure function with its own tests.
 *
 * **What it needs that the app does not have.** A **zone list** — real polygons from the zone
 * service, which does not exist yet (PROJECT.md, known issue 14; ADR-036 is still Proposed). So this
 * hook has no caller in a screen today, and it deliberately ships **no** zone list of its own: a
 * scripted list in the app would be invented geography, the same thing the demo-disclosure rule
 * keeps off the map. The lists its tests drive are fixtures, and the day the service answers, a
 * caller passes what it returned.
 *
 * What the returned state means:
 *
 * - `status` — the device gate's own status, so a screen can say *why* nothing is being tracked
 *   (`off` for a consent that says no, `denied` for a platform that refused) instead of drawing an
 *   empty list that claims the picker visited nothing.
 * - `zone` — the zone the newest fix fell in, or `null` when the app is not tracking (a zone from
 *   before the watch stopped is not evidence of where anyone is).
 * - `candidate` — an entry that has not yet earned the policy's dwell minimum, so a screen can draw
 *   “here now” honestly before a visit exists.
 * - `visits`, `events` — what the tracker decided, in the order it decided it. Events are kept for
 *   the life of the screen; a consumer that wants to act on them reads the youngest.
 *
 * The visit ids are the app's own (`randomUUID`, ADR-005's client-generated idempotency key) unless
 * a caller injects its own, which is how the tests stay deterministic.
 */
export type UseVisitPresenceOptions = {
  /** The zones the picker may be in — what the zone service returns, or a test's fixture. */
  zones: readonly ZonePolygon[];
  /**
   * The rule set presence is judged by. Defaults to the server's stand-in policy
   * (`DEFAULT_VISIT_POLICY`, docs/demo-and-stand-ins.md B5) — the fetched policy replaces it.
   */
  policy?: VisitPolicy;
  /** The position seam; tests and device-free callers supply their own. */
  source?: PositionSource;
  /** How overlapping zones resolve; the app's current answer is the server's own order. */
  resolve?: ZoneResolution;
  /** How a new visit is keyed. The app mints a UUID; tests inject a counter. */
  nextVisitId?: () => string;
};

export type VisitPresenceState = {
  status: DevicePositionStatus;
  zone: ZonePolygon | null;
  candidate: CandidateEntry | null;
  visits: readonly Visit[];
  events: readonly VisitEvent[];
};

export function useVisitPresence({
  nextVisitId = randomUUID,
  policy = DEFAULT_VISIT_POLICY,
  resolve,
  source,
  zones,
}: UseVisitPresenceOptions): VisitPresenceState {
  const [snapshot, setSnapshot] = useState<Omit<VisitPresenceState, 'status'>>({
    candidate: null,
    events: [],
    visits: [],
    zone: null,
  });

  /**
   * The tracker's own state, in a ref rather than in React state: a fix is folded in the event that
   * delivered it — the subscriber `useDevicePosition` calls — which is what keeps this hook from
   * writing state inside an effect. Only the parts a screen renders are pushed into state, and only
   * when the fold changed something: a platform that repeats a fix produces no second visit and no
   * second render.
   */
  const tracker = useRef<{
    events: readonly VisitEvent[];
    state: VisitTrackerState;
    zone: ZonePolygon | null;
  }>({ events: [], state: createVisitTrackerState(), zone: null });

  const handleFix = (next: PositionFix): void => {
    const held = tracker.current;
    const zone = findContainingZone(next, zones, resolve);
    const samples = presenceSamplesFor(held.zone?.id ?? null, zone?.id ?? null, next.at);

    let state = held.state;
    const events = [...held.events];

    for (const sample of samples) {
      const applied = applyPresence(state, sample, policy, { nextVisitId });
      state = applied.state;
      events.push(...applied.events);
    }

    const changed =
      state !== held.state || events.length !== held.events.length || zone !== held.zone;
    tracker.current = { events, state, zone };

    if (changed) {
      setSnapshot({ candidate: state.candidate, events, visits: state.visits, zone });
    }
  };

  const { status } = useDevicePosition({ onFix: handleFix, source });

  return {
    ...snapshot,
    status,
    // A zone the app is no longer watching is not where the picker is now.
    zone: status === 'tracking' ? snapshot.zone : null,
  };
}
