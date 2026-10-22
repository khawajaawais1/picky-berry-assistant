import type { AppEnvironment } from '@/config/env';

/**
 * The one code the app accepts while no account service can check a code — the account service's
 * stand-in, which screen 04 and the session port both ask (ADR-027).
 *
 * It lives here rather than with the verification screen because the question it answers is the
 * **service's**, not a screen's: “is this code the one we sent?”. Screen 04 asks it so it can
 * refuse a wrong code on the spot, and the session port asks it so a session can only be issued
 * for a credential that passed. One rule, two callers — a second copy in the port would be a
 * second answer to the same question, and the two would drift.
 *
 * It exists so the flow past screen 04 can be walked while the account service is still to be
 * decided (PROJECT.md, open question 12) and built. It is a **stand-in for an answer only the
 * server may give**: the client never decides whether a credential is valid (SECURITY.md), which
 * is why the rule below is off in a production build, and why this constant goes with it when
 * the API lands.
 */
export const STUB_CODE = '000000';

/** What the app can say about a code it cannot have checked. */
export type CodeVerdict = 'accepted' | 'rejected';

/**
 * The stand-in for the account service: what the app answers when nothing can check a code.
 *
 * Outside a production build it accepts exactly `STUB_CODE` and refuses every other code, so
 * a near miss is not a way in and a tester can walk the flow with a code the repository
 * documents. In a production build it refuses **everything**, including the stand-in: a
 * misconfigured or missing environment variable must not become a door (see `appEnvironment`).
 * When the account service exists this function is deleted, and the answer comes from the server
 * with the rest of the flow.
 */
export function verifyCode(code: string, environment: AppEnvironment): CodeVerdict {
  if (environment === 'production') return 'rejected';

  return code === STUB_CODE ? 'accepted' : 'rejected';
}
