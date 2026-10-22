/**
 * Which of the two identifiers an account is reached by, as a pure rule.
 *
 * Screen 03 offers both — an email address and a phone number — and the flow that follows keeps
 * whichever was typed, not the mode it was typed in (`pending-verification.ts` holds the
 * destination, the session holds the identifier). Two places therefore have to work out what a
 * string is rather than being told:
 *
 * - the account row on frame 14, which prints the frame's “Email verified” or “Phone verified” and
 *   **must not print the wrong one over an identifier** — the design's example is an address;
 * - screen 04, whose title and way back to the field follow the destination the code belongs to
 *   ([ADR-049](../docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) §3.1–§3.2).
 *
 * It lives in the shared pure helpers rather than in either feature because both need the same
 * answer and neither may import the other's internals (AGENTS.md §3, ARCHITECTURE.md §3.1): the
 * rule arrived here on 2026-10-13 from `privacy`'s account row, where it had been written for the
 * first of the two callers (ADR-049 §4 records that cost).
 *
 * **This is not a validation.** Whether an identifier is one the account service will accept is the
 * provider's answer and the API contract's, never a client check pretending to be one (CONTEXT.md,
 * **Credential**). The rule reads one thing: a string screen 03 or the sign-in screen collected.
 */

/** The two identifiers the flow offers, as the catalogue's own two words for them. */
export type IdentifierKind = 'email' | 'phone';

/**
 * The kind of identifier a string is.
 *
 * An `@` makes it an address; everything else is read as a number, including the empty string. An
 * empty identifier is a floor rather than a state — the flow refuses one before a screen is asked
 * about it (screen 03's form, the sign-in screen's action) — so the rule answers rather than
 * throwing, and a caller that had to check for emptiness first would be reading the same string
 * twice.
 */
export function identifierKind(identifier: string): IdentifierKind {
  return identifier.trim().includes('@') ? 'email' : 'phone';
}
