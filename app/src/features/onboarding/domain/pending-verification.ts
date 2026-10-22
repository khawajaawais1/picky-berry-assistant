/**
 * The one thing screen 04 needs from screen 03: the destination the code is for, and the name the
 * account is being created with. (Nothing in the app sends a code — there is no transport — so this
 * is what the screen names, not where a message went: ADR-048.)
 *
 * It is held in memory rather than passed as a route parameter, because on the web
 * target a route parameter is a URL — an address there ends up in history, in a share
 * and in whatever reads the URL, and it would let screen 04 name an address that no
 * sign-up in this app ever asked about.
 *
 * The **password never leaves screen 03**: it is the account's own secret and is not screen 04's
 * business (SECURITY.md). The name does travel, and that is a decision rather than a leftover:
 * screen 03 asks for it, the account is stored under it, and screen 04 hands it to the session
 * port so the session can carry it (ADR-029). Keeping it back would mean collecting a name and
 * throwing it away — personal data held for no purpose — and the settings screen could not say
 * whose settings the user is looking at. It is held in memory for the length of the flow and
 * written nowhere.
 *
 * This is deliberately the smallest thing that works until the API exists: the code
 * request will answer with what the screen should say, and this module goes away with it.
 * It does not survive a reload, which is also why screen 04 can be opened on its own —
 * the frame's example address and name are the fallbacks (see the route).
 *
 * **Which journey asked for the code** is part of the record, because the code screen serves
 * two of them. The design owner chose the reading where signing in is *one screen plus frame 04*
 * (ADR-034), so a returning user walks the same six cells a sign-up does and the two differ
 * only in what the flow carries and where it ends: a sign-up has the name screen 03 collected
 * and continues to screen 05, while a sign-in has no name at all — the account's own name is the
 * account service's answer, and no service exists yet — and ends inside the app.
 */

/** Which journey the code below belongs to. */
export type VerificationPurpose = 'sign-up' | 'sign-in';

export type VerificationRequest = {
  /** An email address or a phone number, as typed on screen 03 or on the sign-in screen. */
  destination: string;
  /**
   * The account's name, as typed on screen 03 — or `null` when the journey has none to offer,
   * which is what a sign-in carries until the account service can answer with the account's own
   * name (ADR-038). The key is always written; `null` is a state, not a missing field.
   */
  displayName: string | null;
  purpose: VerificationPurpose;
};

let pending: VerificationRequest | null = null;

/**
 * Records the destination the code is for and the name it is about.
 *
 * Either one empty is nothing to remember: a request the verification screen could not complete
 * — an address it cannot name, or an account the session port would refuse for having no name —
 * is not one the flow can go on with (the same rule the form follows).
 */
export function rememberVerificationRequest(destination: string, displayName: string): void {
  const trimmedDestination = destination.trim();
  const trimmedName = displayName.trim();

  pending =
    trimmedDestination === '' || trimmedName === ''
      ? null
      : { destination: trimmedDestination, displayName: trimmedName, purpose: 'sign-up' };
}

/**
 * Records the destination for a **returning user**, who typed no name.
 *
 * A sign-in has nothing else to carry: the account exists, so its own name is the account
 * service's answer rather than something the screen asks for again — and the session records
 * that it has none rather than borrowing the address as one (ADR-038). An empty address is
 * nothing to remember, exactly as it is for a sign-up.
 */
export function rememberSignInRequest(destination: string): void {
  const trimmedDestination = destination.trim();

  pending =
    trimmedDestination === ''
      ? null
      : { destination: trimmedDestination, displayName: null, purpose: 'sign-in' };
}

/** What the flow is waiting on, or `null` when no sign-up is in flight. */
export function peekVerificationRequest(): VerificationRequest | null {
  // A copy, so a caller cannot edit what the screen reads next.
  return pending === null ? null : { ...pending };
}

/** Drops it, once the code has been verified or the flow is left behind. */
export function forgetVerificationRequest(): void {
  pending = null;
}
