/**
 * What frame 13 (Account and offline · Downloads, node `5:23530`) claims about the connection,
 * as something the app is allowed to say.
 *
 * The frame opens with a status message — “You're offline · Keep picking. Visits and reports are
 * saved on your phone.” That claim used to be absent from the built screen because the app had no
 * way to observe the connection, and a screen must not state a fact about the device it cannot
 * see. The device's own report (`expo-network`) makes it observable, so the message is drawn
 * exactly when it is true — and the rule that decides that lives here, as a pure function, so it
 * is tested rather than embedded in a component.
 *
 * Nothing here is stored or sent: the network state is read to draw a sentence and is forgotten.
 */

/**
 * One of three honest answers about the connection:
 *
 * - `unknown` — the platform has not answered yet, or answered without saying. A screen draws
 *   nothing: an unanswered question is not a “yes” and not a “no”;
 * - `offline` — no connection, or a connection with no reachable internet behind it;
 * - `online` — a connection the platform reports as up and reachable.
 */
export type ConnectionState = 'unknown' | 'online' | 'offline';

/**
 * The platform's network report, as much of it as this rule reads
 * (`NetworkState` in `expo-network`: every field is optional while the answer is in flight).
 */
export type ReportedNetworkState = {
  isConnected?: boolean;
  isInternetReachable?: boolean;
};

/**
 * Reads a platform report as the app's own answer.
 *
 * Either field saying “no” is enough to be offline — a radio link with no internet behind it is
 * offline for everything this app would send over it — and either field saying “yes” (with the
 * other silent) is enough to be online, because a platform that reports only one of the two has
 * still answered. Two silences are `unknown`, never a guess in either direction.
 */
export function connectionState(reported: ReportedNetworkState): ConnectionState {
  if (reported.isConnected === false || reported.isInternetReachable === false) {
    return 'offline';
  }

  if (reported.isConnected === true || reported.isInternetReachable === true) {
    return 'online';
  }

  return 'unknown';
}
