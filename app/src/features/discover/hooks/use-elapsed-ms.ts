import { useEffect, useState } from 'react';

/**
 * The elapsed time since `startedAtMs`, re-read once a second while `running`.
 *
 * `startedAtMs` is an *instant*, not a duration, because the caller owns the clock's story:
 * frame 09's timer freezes while the visit is paused and resumes without counting the pause,
 * which the screen does by handing this hook a new instant (`now - the frozen reading`) when
 * it resumes. The hook itself therefore has one rule: while it runs, it reports the truth
 * about the instant it was given; while it is not running, it holds the last reading.
 *
 * The first reading happens in the state's initialiser, so the timer never paints 00:00:00
 * for a moment on a visit that has been running for 42 minutes.
 */
export function useElapsedMs(startedAtMs: number, running = true): number {
  const [elapsedMs, setElapsedMs] = useState(() => Math.max(0, Date.now() - startedAtMs));

  useEffect(() => {
    if (!running) {
      return;
    }

    const read = () => setElapsedMs(Math.max(0, Date.now() - startedAtMs));
    // A restarted clock (a resume) must be read now, not a second from now.
    read();

    const interval = setInterval(read, 1000);

    return () => clearInterval(interval);
  }, [running, startedAtMs]);

  return elapsedMs;
}
