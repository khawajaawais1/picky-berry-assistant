import { act, renderHook } from '@testing-library/react-native';

import { useNow } from '../use-now';

/**
 * The clock a live reading uses — frame 14's account surface, where a session's own hour is said out
 * loud (ADR-041).
 *
 * What has to be right is small and exact: the first reading is *now* rather than the moment the
 * screen was built, it moves on by itself, and it stops when the screen does. A hook that only
 * re-read on re-render would leave a countdown frozen; one that never cleared its interval would go
 * on re-rendering a screen the user has left.
 */
const START = new Date('2026-10-11T09:00:00.000Z');

/** One second, the way the interval fires it: a state update inside `act`. */
async function tick() {
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
}

describe('useNow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts at the moment it is, not at a stale one', async () => {
    const { result } = await renderHook(() => useNow());

    expect(result.current.getTime()).toBe(START.getTime());
  });

  it('moves on by itself, a second at a time', async () => {
    const { result } = await renderHook(() => useNow());

    await tick();
    expect(result.current.getTime()).toBe(START.getTime() + 1000);

    // A jump in the clock is read whole: a screen that has been backgrounded for an hour shows the
    // hour, not a countdown that crawls after it.
    await act(async () => {
      jest.setSystemTime(new Date(START.getTime() + 60 * 60 * 1000));
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.getTime()).toBe(START.getTime() + 60 * 60 * 1000 + 1000);
  });

  it('stops when the screen is gone', async () => {
    // The whole environment's timers are not a usable signal — the runner and React keep their own —
    // so what is asserted is that the effect's cleanup runs on unmount and clears a timer there.
    const clearInterval = jest.spyOn(global, 'clearInterval');

    const { unmount } = await renderHook(() => useNow());

    await tick();
    const clearedWhileReading = clearInterval.mock.calls.length;

    await unmount();

    expect(clearInterval.mock.calls.length).toBeGreaterThan(clearedWhileReading);

    clearInterval.mockRestore();
  });
});
