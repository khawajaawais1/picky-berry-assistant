import { act, renderHook } from '@testing-library/react-native';

import { useCountdown } from '../use-countdown';

/**
 * The count screen 04's resend action waits on. It is a hook rather than a component
 * because the screen owns the rendering; the tick is the only thing that has to stop.
 */

/**
 * Moves the clock on one second at a time. Each tick is a state update that re-arms the
 * next timeout in an effect, so a single forward jump would fire one one and stop there:
 * the wait has to be advanced the way it actually runs, a second at a time.
 */
async function advanceSeconds(seconds: number) {
  for (let index = 0; index < seconds; index += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

describe('useCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts at the duration it is given', async () => {
    const { result } = await renderHook(() => useCountdown(60));

    expect(result.current[0]).toBe(60);
  });

  it('counts one second at a time', async () => {
    const { result } = await renderHook(() => useCountdown(60));

    await advanceSeconds(1);
    expect(result.current[0]).toBe(59);

    await advanceSeconds(9);
    expect(result.current[0]).toBe(50);
  });

  it('stops at zero and keeps counting nothing instead of running negative', async () => {
    const { result } = await renderHook(() => useCountdown(3));

    await advanceSeconds(10);

    expect(result.current[0]).toBe(0);
  });

  it('restarts on request', async () => {
    const { result } = await renderHook(() => useCountdown(60));

    await advanceSeconds(2);
    expect(result.current[0]).toBe(58);

    await act(async () => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(60);
  });

  it('clears its pending timeout when it is unmounted, so a removed screen leaves nothing counting', async () => {
    // The whole environment's timers are not a usable signal here — the test runner and
    // React keep some of their own, and unmounting adds to them — so what is asserted is
    // that the effect's cleanup runs on unmount and clears a timer there.
    const clearTimeout = jest.spyOn(global, 'clearTimeout');

    const { unmount } = await renderHook(() => useCountdown(60));

    await advanceSeconds(1);
    const clearedWhileCounting = clearTimeout.mock.calls.length;

    await unmount();

    expect(clearTimeout.mock.calls.length).toBeGreaterThan(clearedWhileCounting);

    clearTimeout.mockRestore();
  });
});
