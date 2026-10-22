import { useEffect, useState } from 'react';

/**
 * The moment it is, re-read once a second while the screen that asked is mounted.
 *
 * A screen that shows something *about to change on its own* has to notice when it does, and the
 * two things that do are the visit clock (frame 09, `features/discover/hooks/use-elapsed-ms.ts`,
 * which counts up) and a session running out (frame 14's account surface, which counts down). This
 * is the counting-down half: the moment itself, handed to whoever owns the rule — the session's
 * expiry is `remainingMilliseconds`/`isExpired` (`src/services/session/session.ts`), pure functions
 * that take the moment they are asked about, so nothing here decides anything about a session.
 *
 * The first reading is the state's initialiser, so a screen never paints a stale moment and then
 * corrects itself, and the interval is cleared on unmount so a screen the user has left does not go
 * on re-rendering in the background.
 *
 * Why a whole second: it is the granularity a reading in minutes needs to cross its own boundary on
 * time, it is the tick frame 09's timer already uses, and a faster clock would be a re-render a
 * second nobody can see.
 */
const TICK_MS = 1000;

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), TICK_MS);

    return () => clearInterval(interval);
  }, []);

  return now;
}
