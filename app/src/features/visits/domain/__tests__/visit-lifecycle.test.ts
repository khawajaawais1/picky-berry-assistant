import { DEFAULT_VISIT_POLICY, type VisitPolicy } from '../visit-policy';
import {
  applyPresence,
  createVisitTrackerState,
  finalizeExpired,
  type Visit,
  type VisitEvent,
  type VisitTrackerDeps,
  type ZonePresenceSample,
} from '../visit-lifecycle';

const MINUTE = 60_000;
const DAY = 86_400_000;
const T0 = 1_700_000_000_000;

/** Deterministic day function: every 24 h boundary is a new local day. */
const DAY_DEPENDENCIES: VisitTrackerDeps = {
  nextVisitId: () => 'generated-id',
  localDayOf: (at) => Math.floor(at / DAY),
};

function depsWithIds(ids: readonly string[]): VisitTrackerDeps {
  let index = 0;
  return {
    localDayOf: DAY_DEPENDENCIES.localDayOf,
    nextVisitId: () => ids[index++] ?? `overflow-${index}`,
  };
}

const inside = (zoneId: string, at: number): ZonePresenceSample => ({ zoneId, inside: true, at });
const outside = (zoneId: string, at: number): ZonePresenceSample => ({ zoneId, inside: false, at });

const policy: VisitPolicy = DEFAULT_VISIT_POLICY;

function eventTypes(events: readonly VisitEvent[]): string[] {
  return events.map((event) => event.type);
}

describe('applyPresence', () => {
  it('reports nothing for an outside sample with no tracked presence', () => {
    const result = applyPresence(
      createVisitTrackerState(),
      outside('zone-a', T0),
      policy,
      DAY_DEPENDENCIES,
    );

    expect(result.events).toEqual([]);
    expect(result.state.visits).toEqual([]);
    expect(result.state.candidate).toBeNull();
  });

  it('ignores a pass-through shorter than the dwell minimum', () => {
    let state = createVisitTrackerState();

    state = applyPresence(state, inside('zone-a', T0), policy, DAY_DEPENDENCIES).state;
    const result = applyPresence(
      state,
      outside('zone-a', T0 + 4 * MINUTE),
      policy,
      DAY_DEPENDENCIES,
    );

    expect(result.events).toEqual([
      { type: 'entry-ignored', zoneId: 'zone-a', at: T0 + 4 * MINUTE, reason: 'dwell-not-met' },
    ]);
    expect(result.state.visits).toEqual([]);
    expect(result.state.candidate).toBeNull();
  });

  it('opens a visit once the dwell minimum is satisfied', () => {
    let state = createVisitTrackerState();

    state = applyPresence(state, inside('zone-a', T0), policy, DAY_DEPENDENCIES).state;
    const result = applyPresence(
      state,
      inside('zone-a', T0 + 6 * MINUTE),
      policy,
      DAY_DEPENDENCIES,
    );

    expect(eventTypes(result.events)).toEqual(['visit-opened']);
    expect(result.state.visits).toHaveLength(1);
    expect(result.state.visits[0]).toMatchObject({
      zoneId: 'zone-a',
      openedAt: T0,
      lastPresenceAt: T0 + 6 * MINUTE,
      finalizedAt: null,
      policyVersion: policy.version,
    });
    expect(result.state.visits[0]!.segments).toEqual([{ enteredAt: T0, exitedAt: null }]);
  });

  it('back-dates the visit to the entry time, not to the moment the dwell was confirmed', () => {
    let state = createVisitTrackerState();

    state = applyPresence(state, inside('zone-a', T0), policy, DAY_DEPENDENCIES).state;
    const result = applyPresence(
      state,
      inside('zone-a', T0 + 30 * MINUTE),
      policy,
      DAY_DEPENDENCIES,
    );

    expect(result.state.visits[0]!.openedAt).toBe(T0);
  });

  it('opens and closes a visit when the exit sample is the first evidence after the dwell', () => {
    let state = createVisitTrackerState();

    state = applyPresence(state, inside('zone-a', T0), policy, DAY_DEPENDENCIES).state;
    const result = applyPresence(
      state,
      outside('zone-a', T0 + 6 * MINUTE),
      policy,
      DAY_DEPENDENCIES,
    );

    expect(eventTypes(result.events)).toEqual(['visit-opened', 'segment-closed']);
    expect(result.state.visits[0]!.segments).toEqual([
      { enteredAt: T0, exitedAt: T0 + 6 * MINUTE },
    ]);
    expect(result.state.visits[0]!.finalizedAt).toBeNull();
  });

  it('keeps an accepted visit open while the user stays inside', () => {
    let state = createVisitTrackerState();
    state = applyPresence(state, inside('zone-a', T0), policy, DAY_DEPENDENCIES).state;
    state = applyPresence(state, inside('zone-a', T0 + 6 * MINUTE), policy, DAY_DEPENDENCIES).state;

    const result = applyPresence(
      state,
      inside('zone-a', T0 + 20 * MINUTE),
      policy,
      DAY_DEPENDENCIES,
    );

    expect(result.events).toEqual([]);
    expect(result.state.visits).toHaveLength(1);
    expect(result.state.visits[0]!.lastPresenceAt).toBe(T0 + 20 * MINUTE);
  });

  it('resumes the same visit on re-entry within the grace window', () => {
    let state = createVisitTrackerState();
    state = applyPresence(state, inside('zone-a', T0), policy, DAY_DEPENDENCIES).state;
    state = applyPresence(state, inside('zone-a', T0 + 6 * MINUTE), policy, DAY_DEPENDENCIES).state;
    state = applyPresence(
      state,
      outside('zone-a', T0 + 10 * MINUTE),
      policy,
      DAY_DEPENDENCIES,
    ).state;

    const result = applyPresence(
      state,
      inside('zone-a', T0 + 20 * MINUTE),
      policy,
      DAY_DEPENDENCIES,
    );

    expect(eventTypes(result.events)).toEqual(['visit-resumed']);
    expect(result.state.visits).toHaveLength(1);
    expect(result.state.visits[0]!.segments).toEqual([
      { enteredAt: T0, exitedAt: T0 + 10 * MINUTE },
      { enteredAt: T0 + 20 * MINUTE, exitedAt: null },
    ]);
    expect(result.state.visits[0]!.finalizedAt).toBeNull();
  });

  it('finalizes the previous visit and starts a new one when re-entry is too late', () => {
    let state = createVisitTrackerState();
    state = applyPresence(state, inside('zone-a', T0), policy, DAY_DEPENDENCIES).state;
    state = applyPresence(state, inside('zone-a', T0 + 6 * MINUTE), policy, DAY_DEPENDENCIES).state;
    state = applyPresence(
      state,
      outside('zone-a', T0 + 10 * MINUTE),
      policy,
      DAY_DEPENDENCIES,
    ).state;

    const late = T0 + 10 * MINUTE + policy.graceMs + 1;
    const reopening = applyPresence(
      state,
      inside('zone-a', late),
      policy,
      depsWithIds(['visit-2']),
    );

    expect(eventTypes(reopening.events)).toEqual(['visit-finalized']);
    expect(reopening.state.visits).toHaveLength(1);
    expect(reopening.state.visits[0]!.finalizedAt).toBe(T0 + 10 * MINUTE);
    // The dwell must be earned again, so the entry is only a candidate for now.
    expect(reopening.state.candidate).toMatchObject({ zoneId: 'zone-a', enteredAt: late });

    const confirmed = applyPresence(
      reopening.state,
      inside('zone-a', late + 6 * MINUTE),
      policy,
      depsWithIds(['visit-2']),
    );
    expect(eventTypes(confirmed.events)).toEqual(['visit-opened']);
    expect(confirmed.state.visits).toHaveLength(2);
    expect(confirmed.state.visits[1]!.id).toBe('visit-2');
  });

  it('keeps visits of different zones independent', () => {
    let state = createVisitTrackerState();
    state = applyPresence(state, inside('zone-a', T0), policy, DAY_DEPENDENCIES).state;
    state = applyPresence(state, inside('zone-a', T0 + 6 * MINUTE), policy, DAY_DEPENDENCIES).state;

    const result = applyPresence(
      state,
      inside('zone-b', T0 + 10 * MINUTE),
      policy,
      DAY_DEPENDENCIES,
    );

    expect(result.state.visits).toHaveLength(1);
    expect(result.state.visits[0]!.zoneId).toBe('zone-a');
    expect(result.state.visits[0]!.segments[0]!.exitedAt).toBeNull();
    expect(result.state.candidate).toMatchObject({ zoneId: 'zone-b' });
  });

  it('abandons a pending entry when presence is reported in another zone', () => {
    let state = createVisitTrackerState();
    state = applyPresence(state, inside('zone-a', T0), policy, DAY_DEPENDENCIES).state;

    const result = applyPresence(
      state,
      inside('zone-b', T0 + 2 * MINUTE),
      policy,
      DAY_DEPENDENCIES,
    );

    expect(result.events).toEqual([
      { type: 'entry-ignored', zoneId: 'zone-a', at: T0 + 2 * MINUTE, reason: 'dwell-not-met' },
    ]);
    expect(result.state.visits).toEqual([]);
    expect(result.state.candidate).toMatchObject({ zoneId: 'zone-b' });
  });

  it('ignores duplicate and out-of-order samples', () => {
    let state = createVisitTrackerState();
    state = applyPresence(state, inside('zone-a', T0), policy, DAY_DEPENDENCIES).state;
    state = applyPresence(state, inside('zone-a', T0 + 6 * MINUTE), policy, DAY_DEPENDENCIES).state;

    const duplicate = applyPresence(
      state,
      inside('zone-a', T0 + 6 * MINUTE),
      policy,
      DAY_DEPENDENCIES,
    );
    const stale = applyPresence(
      duplicate.state,
      outside('zone-a', T0 + 1 * MINUTE),
      policy,
      DAY_DEPENDENCIES,
    );

    expect(duplicate.events).toEqual([]);
    expect(stale.events).toEqual([]);
    expect(stale.state.visits[0]!.segments[0]!.exitedAt).toBeNull();
    expect(stale.state.visits[0]!.lastPresenceAt).toBe(T0 + 6 * MINUTE);
  });

  it('does not mutate the state it was given', () => {
    const previous = applyPresence(
      createVisitTrackerState(),
      inside('zone-a', T0),
      policy,
      DAY_DEPENDENCIES,
    ).state;
    const snapshot = JSON.stringify(previous);

    applyPresence(previous, inside('zone-a', T0 + 6 * MINUTE), policy, DAY_DEPENDENCIES);

    expect(JSON.stringify(previous)).toBe(snapshot);
  });

  it('uses the injected id generator as the visit idempotency key', () => {
    let state = createVisitTrackerState();
    state = applyPresence(state, inside('zone-a', T0), policy, depsWithIds(['key-1'])).state;

    const result = applyPresence(
      state,
      inside('zone-a', T0 + 6 * MINUTE),
      policy,
      depsWithIds(['key-1']),
    );

    expect(result.state.visits[0]!.id).toBe('key-1');
  });

  describe('calendar-day span', () => {
    it('ends the visit on its own local day and starts a fresh entry afterwards', () => {
      const startOfDay = 10 * DAY;
      let state = createVisitTrackerState();
      state = applyPresence(state, inside('zone-a', startOfDay), policy, DAY_DEPENDENCIES).state;
      state = applyPresence(
        state,
        inside('zone-a', startOfDay + 6 * MINUTE),
        policy,
        DAY_DEPENDENCIES,
      ).state;

      const lastPresence = startOfDay + 20 * MINUTE;
      state = applyPresence(state, inside('zone-a', lastPresence), policy, DAY_DEPENDENCIES).state;

      const nextDay = startOfDay + DAY + 5 * MINUTE;
      const result = applyPresence(state, inside('zone-a', nextDay), policy, DAY_DEPENDENCIES);

      expect(eventTypes(result.events)).toEqual(['segment-closed', 'visit-finalized']);
      const visit: Visit = result.state.visits[0]!;
      expect(visit.finalizedAt).toBe(lastPresence);
      expect(visit.segments).toEqual([{ enteredAt: startOfDay, exitedAt: lastPresence }]);
      expect(result.state.candidate).toMatchObject({ zoneId: 'zone-a', enteredAt: nextDay });
    });

    it('does not split a visit that stays inside one local day', () => {
      const startOfDay = 10 * DAY;
      let state = createVisitTrackerState();
      state = applyPresence(state, inside('zone-a', startOfDay), policy, DAY_DEPENDENCIES).state;
      state = applyPresence(
        state,
        inside('zone-a', startOfDay + 6 * MINUTE),
        policy,
        DAY_DEPENDENCIES,
      ).state;

      const result = applyPresence(
        state,
        inside('zone-a', startOfDay + DAY - 1),
        policy,
        DAY_DEPENDENCIES,
      );

      expect(result.events).toEqual([]);
      expect(result.state.visits).toHaveLength(1);
      expect(result.state.visits[0]!.finalizedAt).toBeNull();
    });
  });
});

describe('finalizeExpired', () => {
  function closedVisitState() {
    let state = createVisitTrackerState();
    state = applyPresence(state, inside('zone-a', T0), policy, DAY_DEPENDENCIES).state;
    state = applyPresence(state, inside('zone-a', T0 + 6 * MINUTE), policy, DAY_DEPENDENCIES).state;
    return applyPresence(state, outside('zone-a', T0 + 10 * MINUTE), policy, DAY_DEPENDENCIES)
      .state;
  }

  it('finalizes a visit once the grace window has passed', () => {
    const state = closedVisitState();

    const result = finalizeExpired(state, T0 + 10 * MINUTE + policy.graceMs + 1, policy);

    expect(eventTypes(result.events)).toEqual(['visit-finalized']);
    expect(result.state.visits[0]!.finalizedAt).toBe(T0 + 10 * MINUTE);
  });

  it('still allows a resume exactly at the end of the grace window', () => {
    const state = closedVisitState();
    const boundary = T0 + 10 * MINUTE + policy.graceMs;

    const pending = finalizeExpired(state, boundary, policy);
    const resumed = applyPresence(
      pending.state,
      inside('zone-a', boundary),
      policy,
      DAY_DEPENDENCIES,
    );

    expect(pending.events).toEqual([]);
    expect(eventTypes(resumed.events)).toEqual(['visit-resumed']);
    expect(resumed.state.visits).toHaveLength(1);
  });

  it('never finalizes a visit that is still open, however long it lasts', () => {
    let state = createVisitTrackerState();
    state = applyPresence(state, inside('zone-a', T0), policy, DAY_DEPENDENCIES).state;
    state = applyPresence(state, inside('zone-a', T0 + 6 * MINUTE), policy, DAY_DEPENDENCIES).state;

    const result = finalizeExpired(state, T0 + 10 * DAY, policy);

    expect(result.events).toEqual([]);
    expect(result.state.visits[0]!.finalizedAt).toBeNull();
  });

  it('leaves an already finalized visit alone', () => {
    const once = finalizeExpired(closedVisitState(), T0 + 10 * MINUTE + policy.graceMs + 1, policy);
    const twice = finalizeExpired(once.state, T0 + 20 * DAY, policy);

    expect(twice.events).toEqual([]);
    expect(twice.state.visits[0]!.finalizedAt).toBe(once.state.visits[0]!.finalizedAt);
  });
});
