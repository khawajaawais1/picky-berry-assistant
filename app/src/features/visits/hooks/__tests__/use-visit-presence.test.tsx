import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useVisitPresence as publicUseVisitPresence } from '@/features/visits';
import { CONSENT_STORAGE_KEY } from '@/services/privacy-consent';
import type { PositionFix, PositionHandlers, PositionSource } from '@/services/location';

import type { ZonePolygon } from '../../domain/zone-containment';
import { useVisitPresence } from '../use-visit-presence';

/**
 * The whole chain, end to end and without a device: a scripted zone list (the app's stand-in for
 * the service that does not exist yet, PROJECT.md known issue 14) and a scripted sequence of fixes
 * through the port, out the other side as visits.
 *
 * **The zone list below is a fixture, not a stand-in in the shipped app.** Two squares of real
 * latitude and longitude are enough to assert which zone a fix falls in; they are not shipped,
 * because a scripted list in the app would be invented geography — the same rule that keeps the
 * design's position marker from claiming “you are here” (ADR-045, ADR-021). The payload the real
 * service returns is the thing this hook is waiting for (ADR-036, still Proposed).
 *
 * The scripted fixes follow the story the frames draw: arrive, stand in the patch, walk out, come
 * back within the grace window, and later walk into another zone.
 */
jest.mock('expo-crypto', () => ({ randomUUID: () => 'visit-from-the-device' }));

/** Zone 14: a square of about 200 m on a side, the sort of patch a zone is. */
const Z14: ZonePolygon = {
  id: 'Z14',
  ring: [
    { latitude: 62.239, longitude: 25.759 },
    { latitude: 62.239, longitude: 25.761 },
    { latitude: 62.241, longitude: 25.761 },
    { latitude: 62.241, longitude: 25.759 },
  ],
};
const Z09: ZonePolygon = {
  id: 'Z09',
  ring: [
    { latitude: 62.249, longitude: 25.779 },
    { latitude: 62.249, longitude: 25.781 },
    { latitude: 62.251, longitude: 25.781 },
    { latitude: 62.251, longitude: 25.779 },
  ],
};
const ZONES = [Z14, Z09];

/** Comfortably outside both squares. */
const NOWHERE = { latitude: 62.245, longitude: 25.76 };

/** A shorter policy than the server's default, so the dwell and the grace fit in readable numbers. */
const POLICY = { version: 'test-1', dwellMs: 60_000, graceMs: 300_000, maxVisitSpanDays: 1 };

const MINUTE = 60_000;
const START = 1_780_000_000_000;

const CONSENT_ON = JSON.stringify({
  visitTracking: true,
  decidedAt: '2026-10-12T09:00:00.000Z',
});

function fix(where: { latitude: number; longitude: number }, at: number): PositionFix {
  return { accuracyMeters: 10, at, latitude: where.latitude, longitude: where.longitude };
}

function fakeSource(): { fixes: PositionHandlers | null; source: PositionSource; stops: number } {
  const fake = {
    fixes: null as PositionHandlers | null,
    source: {} as PositionSource,
    stops: 0,
  };

  fake.source = {
    requestAvailability: jest.fn(async () => 'granted' as const),
    watch: jest.fn((handlers: PositionHandlers) => {
      fake.fixes = handlers;
      return () => {
        fake.fixes = null;
        fake.stops += 1;
      };
    }) as unknown as PositionSource['watch'],
  };

  return fake;
}

/** A hook mounted under a granted consent, ready for scripted fixes. */
async function mount(policy: typeof POLICY | null = POLICY) {
  await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_ON);
  const device = fakeSource();
  const view = await renderHook(() =>
    // `null` means “the caller named none”, which is what a real screen does: the hook then takes
    // the server's stand-in policy. The other tests name their own so the timings are readable.
    useVisitPresence({ policy: policy ?? undefined, source: device.source, zones: ZONES }),
  );
  await waitFor(() => expect(view.result.current.status).toBe('tracking'));

  return { device, view };
}

async function deliver(
  device: { fixes: PositionHandlers | null },
  next: PositionFix,
): Promise<void> {
  await act(async () => device.fixes?.onFix(next));
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useVisitPresence', () => {
  // The feature's public API is how a screen reaches this hook (ARCHITECTURE.md: other code imports
  // only `features/visits/index.ts`), and nothing else in the app imports it yet — so the export is
  // asserted here rather than left to a caller to discover as missing.
  it('is reachable through the visits feature’s public API', () => {
    expect(publicUseVisitPresence).toBe(useVisitPresence);
  });

  it('opens a visit once the picker has stayed in a zone for the dwell, with the app’s own id', async () => {
    const { device, view } = await mount();

    await deliver(device, fix(Z14.ring[0]!, START));
    // The entry alone is not a visit: the dwell has not been earned yet.
    expect(view.result.current.visits).toEqual([]);
    expect(view.result.current.candidate).toEqual({
      enteredAt: START,
      policyVersion: 'test-1',
      zoneId: 'Z14',
    });

    await deliver(device, fix(Z14.ring[0]!, START + MINUTE));

    expect(view.result.current.candidate).toBeNull();
    expect(view.result.current.visits).toHaveLength(1);
    expect(view.result.current.visits[0]!).toMatchObject({
      id: 'visit-from-the-device',
      openedAt: START,
      policyVersion: 'test-1',
      segments: [{ enteredAt: START, exitedAt: null }],
      zoneId: 'Z14',
    });
    expect(view.result.current.events.map((event) => event.type)).toEqual(['visit-opened']);
    expect(view.result.current.zone).toEqual(Z14);
  });

  it('closes the segment when the picker walks out, and keeps the visit resumable', async () => {
    const { device, view } = await mount();

    await deliver(device, fix(Z14.ring[0]!, START));
    await deliver(device, fix(Z14.ring[0]!, START + MINUTE));
    await deliver(device, fix(NOWHERE, START + 2 * MINUTE));

    const [visit] = view.result.current.visits;
    expect(visit?.segments).toEqual([{ enteredAt: START, exitedAt: START + 2 * MINUTE }]);
    // Still open to resumption: the grace window has not passed (`finalizedAt` stays null), so the
    // picker walking back in continues this visit rather than starting a second one.
    expect(visit?.finalizedAt).toBeNull();
    expect(view.result.current.zone).toBeNull();
    expect(view.result.current.events.map((event) => event.type)).toEqual([
      'visit-opened',
      'segment-closed',
    ]);
  });

  it('resumes the same visit when the picker comes back inside the grace window', async () => {
    const { device, view } = await mount();

    await deliver(device, fix(Z14.ring[0]!, START));
    await deliver(device, fix(Z14.ring[0]!, START + MINUTE));
    await deliver(device, fix(NOWHERE, START + 2 * MINUTE));
    await deliver(device, fix(Z14.ring[0]!, START + 3 * MINUTE));

    expect(view.result.current.visits).toHaveLength(1);
    expect(view.result.current.visits[0]!.segments).toEqual([
      { enteredAt: START, exitedAt: START + 2 * MINUTE },
      { enteredAt: START + 3 * MINUTE, exitedAt: null },
    ]);
    expect(view.result.current.events.map((event) => event.type)).toEqual([
      'visit-opened',
      'segment-closed',
      'visit-resumed',
    ]);
  });

  it('opens a separate visit in another zone', async () => {
    const { device, view } = await mount();

    await deliver(device, fix(Z14.ring[0]!, START));
    await deliver(device, fix(Z14.ring[0]!, START + MINUTE));
    await deliver(device, fix(Z09.ring[0]!, START + 20 * MINUTE));
    await deliver(device, fix(Z09.ring[0]!, START + 21 * MINUTE));

    expect(view.result.current.visits.map((visit) => visit.zoneId)).toEqual(['Z14', 'Z09']);
    expect(view.result.current.zone).toEqual(Z09);
  });

  it('reports nothing and opens nothing while every fix is outside every zone', async () => {
    const { device, view } = await mount();

    await deliver(device, fix(NOWHERE, START));
    await deliver(device, fix(NOWHERE, START + 10 * MINUTE));

    expect(view.result.current.visits).toEqual([]);
    expect(view.result.current.events).toEqual([]);
    expect(view.result.current.zone).toBeNull();
  });

  it('applies each observation once, however often the platform repeats it', async () => {
    const { device, view } = await mount();

    await deliver(device, fix(Z14.ring[0]!, START));
    await deliver(device, fix(Z14.ring[0]!, START + MINUTE));
    // The same fix again: the platform is allowed to repeat itself, and the tracker's own
    // staleness rule is what keeps a repeated observation from opening a second visit.
    await deliver(device, fix(Z14.ring[0]!, START + MINUTE));

    expect(view.result.current.visits).toHaveLength(1);
    expect(
      view.result.current.events.filter((event) => event.type === 'visit-opened'),
    ).toHaveLength(1);
  });

  it('uses the server’s default policy when the caller names none', async () => {
    const { device, view } = await mount(null);

    await deliver(device, fix(Z14.ring[0]!, START));
    // Four minutes: inside the frame's own dwell of five, so the entry is not a visit yet.
    await deliver(device, fix(Z14.ring[0]!, START + 4 * MINUTE));
    expect(view.result.current.visits).toEqual([]);

    await deliver(device, fix(Z14.ring[0]!, START + 5 * MINUTE));

    expect(view.result.current.visits).toHaveLength(1);
    expect(view.result.current.visits[0]!.policyVersion).toBe('default-1');
  });

  it('reads and tracks nothing when the picker has not consented', async () => {
    // No consent record at all: the device seam must not be asked, and no fix may reach the
    // tracker even if one somehow arrived.
    const device = fakeSource();
    const { result } = await renderHook(() =>
      useVisitPresence({ policy: POLICY, source: device.source, zones: ZONES }),
    );

    await waitFor(() => expect(result.current.status).toBe('off'));
    expect(device.fixes).toBeNull();
    expect(result.current.visits).toEqual([]);
    expect(result.current.zone).toBeNull();
  });

  it('tracks nothing when the platform refuses the permission', async () => {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_ON);
    const device = fakeSource();
    device.source = {
      requestAvailability: jest.fn(async () => 'denied' as const),
      watch: jest.fn(() => () => undefined) as unknown as PositionSource['watch'],
    };

    const { result } = await renderHook(() =>
      useVisitPresence({ policy: POLICY, source: device.source, zones: ZONES }),
    );

    await waitFor(() => expect(result.current.status).toBe('denied'));
    expect(result.current.visits).toEqual([]);
  });
});
