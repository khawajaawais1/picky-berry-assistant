import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';

import { CONSENT_STORAGE_KEY } from '@/services/privacy-consent';
import type { PositionFix, PositionHandlers, PositionSource } from '@/services/location';
import { VisitTracker } from '@/features/visits/components/visit-tracker';
import type { ZonePolygon } from '@/features/visits/domain/zone-containment';
import type { VisitsApi } from '@/features/visits/services/visits-api';
import { clearVisitSession } from '@/features/visits/hooks/use-visit-session';

// The route under test: it lives in `src/app`, where every file is a route, so its test lives here.
import ActiveVisitRoute from '@/app/(app)/active-visit';

const mockReplace = jest.fn();

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');

  return {
    router: { replace: (...args: unknown[]) => mockReplace(...args) },
    useCanGoBack: () => true,
    // The real hook runs its callback on focus and whenever the memoized callback changes.
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock('@/features/discover', () => ({
  ActiveVisitScreen: () => null,
}));

/**
 * Screen 09's route reads the tracker through the session store. A visit the picker ends by
 * pressing “End visit” is published directly by the tracker, but a visit presence finalizes after
 * the picker left the zone arrives only through the store's ordinary updates; both must open the
 * report instead of leaving screen 09 on its empty state.
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

const api: VisitsApi = {
  send: jest.fn(async () => ({ kind: 'refused' as const, failure: { kind: 'network' as const } })),
  submit: jest.fn(),
  list: jest.fn(),
};

beforeEach(async () => {
  await AsyncStorage.clear();
  clearVisitSession();
  mockReplace.mockClear();
  await AsyncStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ visitTracking: true, decidedAt: '2026-10-12T09:00:00.000Z' }),
  );
});

describe('the active-visit route', () => {
  it('opens the report when presence finalizes the visit after the picker leaves', async () => {
    const { held, source } = fakeSource();
    let id = 0;

    await render(
      <>
        <VisitTracker
          api={api}
          nextVisitId={() => `4cd7a7d4-e6da-4d4c-bdbf-${String(++id).padStart(12, '0')}`}
          policy={POLICY}
          source={source}
          zones={[ZONE]}
        />
        <ActiveVisitRoute />
      </>,
    );
    await waitFor(() => expect(held.handlers).not.toBeNull());

    const deliver = async (next: PositionFix) => act(async () => held.handlers?.onFix(next));
    await deliver(fix(INSIDE, START));
    await deliver(fix(INSIDE, START + MINUTE));
    expect(mockReplace).not.toHaveBeenCalled();

    // The exit closes the visit's last segment but leaves it resumable inside its grace window.
    await deliver(fix(OUTSIDE, START + 2 * MINUTE));
    expect(mockReplace).not.toHaveBeenCalled();

    // The next fix is past the grace window, so the tracker finalizes the visit on its own.
    await deliver(fix(OUTSIDE, START + 10 * MINUTE));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/post-visit-feedback'));
  });
});
