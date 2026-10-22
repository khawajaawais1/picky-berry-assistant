import { act, renderHook } from '@testing-library/react-native';

import { useElapsedMs } from '../use-elapsed-ms';

/**
 * The clock behind frame 09's timer (node `5:23226`). It is a hook rather than a screen's
 * own `setInterval` because the screen has three things to get right with it — a reading at
 * the first paint, a tick per second, and a reading that does not drift while the timer is
 * paused — and each of those is cheaper to pin here than through the screen.
 */

/** Moves the clock on in one jump, the way a second passes. */
async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('useElapsedMs', () => {
  // Built from local components: the hook reads the device clock, so the test must not
  // depend on the machine's timezone.
  const startedAtMs = new Date(2026, 7, 28, 10, 3, 0).getTime();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(startedAtMs);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reads the elapsed time on the first render, before any tick', async () => {
    jest.setSystemTime(startedAtMs + 42 * 60_000 + 17_000);

    const { result } = await renderHook(() => useElapsedMs(startedAtMs));

    expect(result.current).toBe(42 * 60_000 + 17_000);
  });

  it('ticks once a second while it is running', async () => {
    const { result } = await renderHook(() => useElapsedMs(startedAtMs));

    expect(result.current).toBe(0);

    await advance(1_000);
    expect(result.current).toBe(1_000);

    await advance(4_000);
    expect(result.current).toBe(5_000);
  });

  it('holds the reading while it is not running, however long the pause lasts', async () => {
    const { result, rerender } = await renderHook(
      ({ running }: { running: boolean; since: number }) => useElapsedMs(startedAtMs, running),
      { initialProps: { running: true, since: startedAtMs } },
    );

    await advance(5_000);
    expect(result.current).toBe(5_000);

    await rerender({ running: false, since: startedAtMs });

    await advance(10 * 60_000);
    expect(result.current).toBe(5_000);
  });

  it('picks the new instant up when the caller restarts the clock', async () => {
    // A resume is a new start instant: the caller keeps the frozen reading and hands the hook
    // an instant that many milliseconds ago, so the paused time is not counted (screen 09).
    const { result, rerender } = await renderHook(
      ({ since, running }: { since: number; running: boolean }) => useElapsedMs(since, running),
      { initialProps: { since: startedAtMs, running: true } },
    );

    await advance(5_000);
    await rerender({ since: startedAtMs, running: false });
    await advance(600_000);

    const resumedAtMs = Date.now() - 5_000;
    await rerender({ since: resumedAtMs, running: true });

    expect(result.current).toBe(5_000);
    await advance(2_000);
    expect(result.current).toBe(7_000);
  });

  it('stops the interval when the screen goes away', async () => {
    const clearInterval = jest.spyOn(global, 'clearInterval');
    const { unmount } = await renderHook(() => useElapsedMs(startedAtMs));

    await unmount();

    expect(clearInterval).toHaveBeenCalledTimes(1);
  });
});
