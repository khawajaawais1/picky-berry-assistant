import { useEffect, useState } from 'react';

import { sessionPort, type Session } from '@/services/session';

/**
 * The session the app is holding ([session/index.ts](../services/session/index.ts)), as a screen
 * uses it: who is signed in, or nobody.
 *
 * It lives with the other shared hooks rather than in a feature because a session is about the
 * app rather than about one screen — the settings screen reads it first, and the shell and the
 * sign-in screen will read the same thing when they exist.
 *
 * **Reading is all it does.** The session changes in exactly two places, and neither is here:
 * the sign-up flow acquires one (screen 04, through the port), and signing out drops it
 * (`src/services/sign-out.ts`, after which the caller leaves the screen). So there is no
 * subscription to miss — but there is a read in flight, and a screen must treat that as
 * *nothing is known yet* rather than as *nobody is signed in*: the frame's account row is drawn
 * only once the store has answered, so a screen never shows an empty account while it is still
 * being asked about one.
 *
 * A read that fails is reported, not folded into “nobody”: the difference between *no account*
 * and *the app could not find out* is the difference between drawing nothing and telling the user
 * that the question went unanswered (the same rule the saved-zones hook follows).
 */
export type SessionState = {
  /** The account the app is holding, or `null` when it is holding none. */
  session: Session | null;
  /** True while the session is being read; nothing may be claimed about it yet. */
  loading: boolean;
  /** True when the session could not be read at all — never the same as holding none. */
  error: boolean;
};

export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    sessionPort
      .current()
      .then((held) => {
        if (active) setSession(held);
      })
      .catch(() => {
        // A store that will not answer is not a signed-in user, and it is said out loud rather
        // than presented as nobody being there.
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { error, loading, session };
}
