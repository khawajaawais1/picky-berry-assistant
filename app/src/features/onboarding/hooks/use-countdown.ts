import { useCallback, useEffect, useState } from 'react';

const SECOND_MS = 1000;

/**
 * Counts down, one second at a time, from the duration it is given, and hands back the
 * seconds left with a way to start the wait again — screen 04's resend action uses both.
 *
 * The timeout is re-armed by the state change rather than set as an interval, so a tick
 * that arrives late cannot make the count drift, and the cleanup stops a screen that has
 * been left behind from counting on in the background.
 */
export function useCountdown(seconds: number): [number, () => void] {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      return;
    }

    const timer = setTimeout(() => setRemaining(remaining - 1), SECOND_MS);

    return () => clearTimeout(timer);
  }, [remaining]);

  const restart = useCallback(() => setRemaining(seconds), [seconds]);

  return [remaining, restart];
}
