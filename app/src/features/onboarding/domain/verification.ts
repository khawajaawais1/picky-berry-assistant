/**
 * Screen 04's rules, as pure data and functions.
 *
 * The screen has three things to decide that the frame does not: how long a code is, how long
 * the resend action waits, and how the frame's countdown is written. Whether a code is one the
 * app can accept is **not** among them any more: that is the account service's question, and the
 * stand-in answer to it lives with the session seam (`src/services/session/stand-in-code.ts`,
 * ADR-027), which the session port asks as well.
 */

/** The frame draws six cells, so the code it expects is six digits. */
export const CODE_LENGTH = 6;

/**
 * How long the resend action waits before it can be used again.
 *
 * The frame draws a cooldown in progress (“Resend code · available in 00:28”) and never
 * says how long one runs, so this number is the app's choice rather than the design's and
 * it needs the owner's confirmation (PROJECT.md, open questions). The frame's own 00:28
 * fits inside it, so the state the design draws is reachable.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Whether the typed code is worth sending: exactly the frame's six digits. A code
 * arrives by paste as often as by keyboard, and a paste can carry a space or a letter —
 * a code that is not six digits is refused by the API anyway, so it is refused here.
 */
export function isCodeComplete(code: string): boolean {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code);
}

/**
 * The frame's countdown format, `mm:ss` (`00:28`), with both fields padded so the label
 * does not change width as the count runs down. Below zero it reads `00:00`: the
 * countdown stops at zero, and a negative time is not a state the screen can show.
 */
export function formatCountdown(seconds: number): string {
  const remaining = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(remaining / 60);
  const secondsWithinMinute = remaining % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${pad(minutes)}:${pad(secondsWithinMinute)}`;
}
