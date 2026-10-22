/**
 * The records this phone can be holding, and which of them it is holding now.
 *
 * The Terms & privacy screen (the screen behind frame 14's own row, node 5:23688 — ADR-039) is a
 * claim about the device: it names what is stored, why, and how it goes away. Everything else in
 * that screen is copy; this is the one rule, and it is here rather than in the component because it
 * is a decision about the device's state rather than a drawing of it.
 *
 * **A record is named only when the app knows the phone is holding one.** The input is the state
 * each record's own reader reports, so `undefined` means “not read yet, or the read failed” — and an
 * unknown state is neither “held” nor “nothing held”. That is the same rule the settings screen
 * follows for the plan's count: an unknown count is not a zero, and a notice that guessed would be
 * describing a device it has not read.
 *
 * The order is the order the app collected the records in, which is also the order a reader wants
 * them: who the user is, what they agreed to, what they saved, and what is waiting. It is asserted
 * in this module's test rather than left to the screen.
 */
export type HeldRecord = 'account' | 'consent' | 'plan' | 'queue';

export type StoredRecordState = {
  /** Whether a consent decision has been recorded — in either direction (ADR-020). */
  consentDecided: boolean | undefined;
  /** How many zones the plan holds; the record exists when there is at least one (ADR-024). */
  planCount: number | undefined;
  /** How many reports the queue holds; the record exists when there is at least one (ADR-005). */
  queueCount: number | undefined;
  /** Whether the app is holding a session — which is itself the account record (ADR-028). */
  signedIn: boolean | undefined;
};

/**
 * The records the phone is holding, in the app's own order.
 *
 * The account record is the session: it is held in memory rather than on the device (the stand-in
 * store, ADR-028), and the screen's own copy says so — the record is listed because the app is
 * holding it, not because it was written anywhere.
 */
export function heldRecords(state: StoredRecordState): HeldRecord[] {
  const held: HeldRecord[] = [];

  if (state.signedIn === true) held.push('account');
  if (state.consentDecided === true) held.push('consent');
  if (state.planCount !== undefined && state.planCount > 0) held.push('plan');
  if (state.queueCount !== undefined && state.queueCount > 0) held.push('queue');

  return held;
}
