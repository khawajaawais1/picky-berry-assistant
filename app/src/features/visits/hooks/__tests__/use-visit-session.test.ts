import { act, renderHook } from '@testing-library/react-native';

import {
  clearLastFinalized,
  clearVisitSession,
  endTrackedVisit,
  publishVisitSession,
  registerVisitEnd,
  useVisitSession,
} from '../use-visit-session';

const VISIT = {
  endedAt: 1_780_000_300_000,
  openedAt: 1_780_000_000_000,
  visitId: 'visit-1',
  zoneId: '00000000-0000-4000-8000-000000000014',
  zoneName: 'Laajavuori 1',
};

describe('the visit session store', () => {
  beforeEach(() => {
    clearVisitSession();
  });

  it('publishes the active visit to a screen reading it', async () => {
    const { result } = await renderHook(() => useVisitSession());

    expect(result.current).toEqual({ active: null, candidate: null, lastFinalized: null });

    await act(async () => publishVisitSession({ active: VISIT }));

    expect(result.current.active).toEqual(VISIT);
  });

  it('ends the active visit through the tracker’s registered handler', async () => {
    const handler = jest.fn(() => VISIT);
    const unregister = registerVisitEnd(handler);

    expect(endTrackedVisit(1_780_000_400_000)).toEqual(VISIT);
    expect(handler).toHaveBeenCalledWith(1_780_000_400_000);

    unregister();
    expect(endTrackedVisit()).toBeNull();
  });

  it('keeps the last finalized visit until the report clears it', async () => {
    const { result } = await renderHook(() => useVisitSession());

    await act(async () => publishVisitSession({ lastFinalized: VISIT }));
    expect(result.current.lastFinalized).toEqual(VISIT);

    await act(async () => clearLastFinalized());
    expect(result.current.lastFinalized).toBeNull();

    // The tracker republishes the same ended visit when its visits change; a consumed report must
    // not come back, or the next visit to the feedback route would save it twice.
    await act(async () => publishVisitSession({ lastFinalized: VISIT }));
    expect(result.current.lastFinalized).toBeNull();

    await act(async () => publishVisitSession({ lastFinalized: { ...VISIT, visitId: 'visit-2' } }));
    expect(result.current.lastFinalized?.visitId).toBe('visit-2');
  });
});
