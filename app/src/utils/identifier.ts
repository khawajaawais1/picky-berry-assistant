/**
 * Which identifier an account is reached by, as a pure rule.
 *
 * Since 2026-10-24 the app creates and signs in with an **email address only** — the frame's
 * phone state is deferred with phone sign-in (ADR-054 §5) and screen 04 is retired (ADR-059) —
 * but the account row on frame 14 still has two labels, and it **must not print the wrong one
 * over an identifier** (ADR-049 §4). The rule is kept as the one place that decides, so the day
 * phone sign-in arrives the label follows without a second reading of the string.
 *
 * It lives in the shared pure helpers rather than in `privacy` because it arrived there from
 * screen 04, which needed the same answer; that screen is gone, and the rule stays where the
 * account surface can reach it (AGENTS.md §3, ARCHITECTURE.md §3.1).
 *
 * **This is not a validation.** Whether an identifier is one the account service will accept is the
 * provider's answer and the API contract's, never a client check pretending to be one (CONTEXT.md,
 * **Credential**). The rule reads one thing: the string a session was issued for.
 */

/** The two identifiers the account row can label. */
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
