import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';

import { useDevicePosition, type DevicePositionStatus } from '@/hooks/use-device-position';
import type { PositionFix, PositionSource } from '@/services/location';

import { presenceSamplesFor } from '../domain/position-presence';
import { DEFAULT_VISIT_POLICY, type VisitPolicy } from '../domain/visit-policy';
import {
  applyPresence,
  endVisit,
  finalizeExpired,
  createVisitTrackerState,
  type CandidateEntry,
  type Visit,
  type VisitEvent,
  type VisitTrackerState,
} from '../domain/visit-lifecycle';
import {
  findContainingZone,
  nearestZonePolygons,
  shouldRefreshGeofenceSet,
  type Point,
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
 * The caller supplies the authoritative polygons from `GET /zones` (ADR-066). From those, this hook
 * keeps the plan's 20 nearest foreground geofences and rebuilds that in-memory set after 2 km of
 * movement. Selection is local: no live coordinate is sent to `/zones/near`, persisted or logged.
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
  /**
   * Finalizes every visit whose grace window has passed by `at` (ADR-066). The tracker calls it
   * when the app returns to the foreground, which is evidence of time a fix may not bring: iOS
   * filters by distance alone, so a picker who stood still after walking out sends no fix.
   */
  finalizeNow: (at: number) => void;
  /**
   * Ends the running visit at the picker's request, closing its open segment at `at`. Returns the
   * finalized visit, or null when there is nothing to end.
   */
  endVisitNow: (at: number) => Visit | null;
};

export function useVisitPresence({
  nextVisitId = randomUUID,
  policy = DEFAULT_VISIT_POLICY,
  resolve,
  source,
  zones,
}: UseVisitPresenceOptions): VisitPresenceState {
  const [snapshot, setSnapshot] = useState<
    Omit<VisitPresenceState, 'status' | 'finalizeNow' | 'endVisitNow'>
  >({
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
  const geofenceSet = useRef<{
    /** Exact only while tracking, in memory, and never persisted, logged or sent. */
    anchor: Point;
    source: readonly ZonePolygon[];
    zones: readonly ZonePolygon[];
  } | null>(null);
  /**
   * The zone whose visit the picker ended by hand, while the picker is still inside it.
   *
   * Without this, the next fix would start a candidate immediately and reopen the visit once the
   * dwell passed again — the screen would say “ended” and then begin the same visit on its own.
   * Any fix outside that zone clears the marker, so leaving and coming back is a new visit.
   */
  const endedZone = useRef<string | null>(null);

  const zonesFor = (next: PositionFix): readonly ZonePolygon[] => {
    const held = geofenceSet.current;
    if (held !== null && held.source === zones && !shouldRefreshGeofenceSet(held.anchor, next)) {
      return held.zones;
    }

    const selected = nearestZonePolygons(next, zones);
    geofenceSet.current = {
      anchor: { latitude: next.latitude, longitude: next.longitude },
      source: zones,
      zones: selected,
    };
    return selected;
  };

  const handleFix = (next: PositionFix): void => {
    const held = tracker.current;
    const zone = findContainingZone(next, zonesFor(next), resolve);

    if (endedZone.current !== null) {
      if (zone?.id === endedZone.current) return;
      endedZone.current = null;
    }

    const samples = presenceSamplesFor(held.zone?.id ?? null, zone?.id ?? null, next.at);

    let state = held.state;
    const events = [...held.events];

    for (const sample of samples) {
      const applied = applyPresence(state, sample, policy, { nextVisitId });
      state = applied.state;
      events.push(...applied.events);
    }

    // No ticker closes a visit (ADR-063): the fix is the time evidence. A visit whose grace window
    // has passed by this fix's instant can no longer resume, so it is finalized here (ADR-066).
    const finalized = finalizeExpired(state, next.at, policy);
    state = finalized.state;
    events.push(...finalized.events);

    const changed =
      state !== held.state || events.length !== held.events.length || zone !== held.zone;
    tracker.current = { events, state, zone };

    if (changed) {
      setSnapshot({ candidate: state.candidate, events, visits: state.visits, zone });
    }
  };

  const finalizeNow = (at: number): void => {
    const held = tracker.current;
    const finalized = finalizeExpired(held.state, at, policy);
    if (finalized.events.length === 0) return;

    const events = [...held.events, ...finalized.events];
    tracker.current = { ...held, events, state: finalized.state };
    setSnapshot({
      candidate: finalized.state.candidate,
      events,
      visits: finalized.state.visits,
      zone: held.zone,
    });
  };

  const endVisitNow = (at: number): Visit | null => {
    const held = tracker.current;
    const active = [...held.state.visits].reverse().find((visit) => visit.finalizedAt === null);
    if (active === undefined) return null;

    const ended = endVisit(held.state, active.id, at);
    if (ended.visit === null) return null;

    endedZone.current = active.zoneId;
    const events = [...held.events, ...ended.events];
    tracker.current = { ...held, events, state: ended.state };
    setSnapshot({
      candidate: ended.state.candidate,
      events,
      visits: ended.state.visits,
      zone: held.zone,
    });
    return ended.visit;
  };

  const { status } = useDevicePosition({ onFix: handleFix, source });

  useEffect(() => {
    if (status !== 'tracking') geofenceSet.current = null;
  }, [status]);

  return {
    ...snapshot,
    endVisitNow,
    finalizeNow,
    status,
    // A zone the app is no longer watching is not where the picker is now.
    zone: status === 'tracking' ? snapshot.zone : null,
  };
}
