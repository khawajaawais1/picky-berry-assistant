import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { CONSENT_STORAGE_KEY } from '@/services/privacy-consent';
import type { PositionFix, PositionHandlers, PositionSource } from '@/services/location';

import type { ZonePolygon } from '../../domain/zone-containment';
import type { SubmitOutcome, VisitsApi } from '../../services/visits-api';
import { VisitTracker } from '../visit-tracker';

/**
 * The tracker mounted (ADR-066): position behind the consent record and the platform's
 * permission (ADR-045), folded into visits, and each finalized visit sent to `POST /visits`
 * once. It draws nothing.
 */
const ZONE: ZonePolygon = {
  id: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
  ring: [
    { latitude: 62.239, longitude: 25.759 },
    { latitude: 62.239, longitude: 25.761 },
    { latitude: 62.241, longitude: 25.761 },
    { latitude: 62.241, longitude: 25.759 },
  ],
};
const INSIDE = { latitude: 62.24, longitude: 25.76 };
const OUTSIDE = { latitude: 62.25, longitude: 25.76 };
const MINUTE = 60_000;
const START = Date.parse('2026-08-03T09:00:00.000Z');
const POLICY = { version: 'test-1', dwellMs: MINUTE, graceMs: 5 * MINUTE, maxVisitSpanDays: 1 };

function fix(where: { latitude: number; longitude: number }, at: number): PositionFix {
  return { accuracyMeters: 10, at, ...where };
}

function fakeSource() {
  const held: { handlers: PositionHandlers | null } = { handlers: null };
  const source: PositionSource = {
    requestAvailability: jest.fn(async () => 'granted' as const),
    watch: jest.fn((handlers: PositionHandlers) => {
      held.handlers = handlers;
      return () => {
        held.handlers = null;
      };
    }) as unknown as PositionSource['watch'],
  };
  return { held, source };
}

function recordingApi() {
  const send = jest.fn(async (): Promise<Exclude<SubmitOutcome, { kind: 'skipped' }>> => ({
    kind: 'refused',
    failure: { kind: 'network' },
  }));
  const api: VisitsApi = { send, submit: jest.fn(), list: jest.fn() };
  return { api, send };
}

/** Captures the AppState listener the tracker registers, so a test can bring the app back. */
function captureAppState() {
  let listener: ((state: AppStateStatus) => void) | null = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
    listener = handler as (state: AppStateStatus) => void;
    return { remove: jest.fn() };
  });
  return {
    become: async (state: AppStateStatus) => act(async () => listener?.(state)),
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('VisitTracker', () => {
  it('sends a visit once it is finalized, and only then', async () => {
    await AsyncStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ visitTracking: true, decidedAt: '2026-10-12T09:00:00.000Z' }),
    );
    const { held, source } = fakeSource();
    const { api, send } = recordingApi();
    let id = 0;

    await render(
      <VisitTracker
        api={api}
        nextVisitId={() => `4cd7a7d4-e6da-4d4c-bdbf-${String(++id).padStart(12, '0')}`}
        policy={POLICY}
        source={source}
        zones={[ZONE]}
      />,
    );
    await waitFor(() => expect(held.handlers).not.toBeNull());

    const deliver = async (next: PositionFix) => act(async () => held.handlers?.onFix(next));
    await deliver(fix(INSIDE, START));
    await deliver(fix(INSIDE, START + MINUTE));
    await deliver(fix(OUTSIDE, START + 2 * MINUTE));
    expect(send).not.toHaveBeenCalled();

    await deliver(fix(OUTSIDE, START + 10 * MINUTE));

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ zone_id: ZONE.id }));
  });

  it('finalizes and sends a visit when the app returns to the foreground', async () => {
    await AsyncStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ visitTracking: true, decidedAt: '2026-10-12T09:00:00.000Z' }),
    );
    const appState = captureAppState();
    const { held, source } = fakeSource();
    const { api, send } = recordingApi();
    const now = jest.spyOn(Date, 'now');

    await render(
      <VisitTracker
        api={api}
        nextVisitId={() => '4cd7a7d4-e6da-4d4c-bdbf-000000000001'}
        policy={POLICY}
        source={source}
        zones={[ZONE]}
      />,
    );
    await waitFor(() => expect(held.handlers).not.toBeNull());
    const deliver = async (next: PositionFix) => act(async () => held.handlers?.onFix(next));
    await deliver(fix(INSIDE, START));
    await deliver(fix(INSIDE, START + MINUTE));
    await deliver(fix(OUTSIDE, START + 2 * MINUTE));

    // No further fix: the picker stood still. The app comes back half an hour later.
    now.mockReturnValue(START + 40 * MINUTE);
    await appState.become('background');
    expect(send).not.toHaveBeenCalled();
    await appState.become('active');

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    now.mockRestore();
  });

  it('reads no position without the picker’s consent', async () => {
    const { source } = fakeSource();

    captureAppState();
    await render(<VisitTracker api={recordingApi().api} source={source} zones={[ZONE]} />);

    await waitFor(() => expect(source.watch).not.toHaveBeenCalled());
  });
});
