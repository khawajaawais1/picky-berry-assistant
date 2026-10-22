/**
 * What a session is, and when it stops being one.
 *
 * Pure: no React, no I/O, and no clock of its own — every rule here takes the moment it is
 * asked about. That is what makes expiry testable without waiting an hour, and what lets the
 * port and a screen agree on one answer instead of each computing it.
 *
 * A session is a claim about **who the user is** (ADR-013: a valid token proves identity, never
 * privilege), so the reader below is strict in one direction only: anything the app cannot
 * understand is no session. It is never the other way round — unreadable data must not read as
 * an account, for the same reason an unreadable consent must not read as agreement.
 *
 * It carries the account's identifier **and the name the account is shown under** (ADR-029):
 * screen 03 collects that name, the provider is where a real one would be stored as the
 * profile's display name, and the settings screen reads it back as whose settings these are.
 * The name is what a session is about, not a credential: nothing here proves anything with it.
 */

/**
 * How long a session the stand-in issues is good for.
 *
 * **A stand-in value, not a decision.** The real lifetimes are the provider's — Firebase issues
 * an ID token for an hour and refreshes it behind a longer-lived refresh token (ADR-013), and
 * how the app's own session relates to those two is part of open question 12. An hour is chosen
 * here because it is the length the decided provider actually uses, so a screen built against
 * this number is not built against a fiction; when the account service lands, the value comes
 * from the provider and this constant goes with the stand-in.
 */
export const SESSION_LIFETIME_MS = 60 * 60 * 1000;

/** One signed-in stretch: who it is about, and the window it is good for. */
export type Session = {
  /**
   * The account this session is about, as the provider named it. With the stand-in that is the
   * address or number the code belonged to — the only name it has.
   */
  accountId: string;
  /**
   * The name the account is shown under, as screen 03 collected it (ADR-029) — or `null` when
   * the app has none to offer, which is every account reached by signing in rather than by
   * signing up: the name is the profile's own, so the provider answers with it, and the
   * stand-in behind the port has no profile to read (ADR-038). It is `null` rather than an
   * empty string so that “the service has no name for this account” stays distinct from “a
   * caller forgot one”, and the settings screen names the account by its identifier instead
   * of inventing a person.
   */
  displayName: string | null;
  /** When it stops being usable, ISO-8601. */
  expiresAt: string;
  /** When it was issued, ISO-8601. */
  issuedAt: string;
};

/** Issues a session about an account, good for `SESSION_LIFETIME_MS` from the moment given. */
export function mintSession(
  accountId: string,
  displayName: string | null,
  issuedAt: Date,
): Session {
  return {
    accountId,
    displayName,
    expiresAt: new Date(issuedAt.getTime() + SESSION_LIFETIME_MS).toISOString(),
    issuedAt: issuedAt.toISOString(),
  };
}

/**
 * The shape of a moment this app writes: `toISOString()`'s UTC timestamp, to the millisecond.
 *
 * Narrower than “anything `Date.parse` accepts” on purpose. A date without a time
 * (`2026-10-10`) parses, but nothing in this app writes one, so a value of that shape came from
 * somewhere else — another version, a hand-edit, a truncated write — and “somewhere else” is not
 * a reason to treat a session as one.
 */
const ISO_MOMENT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

/** An ISO-8601 moment the app can actually compare against a clock. */
function isMoment(value: unknown): value is string {
  return typeof value === 'string' && ISO_MOMENT.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Reads a stored value strictly. `null` is “nothing is stored”; anything else that is not a
 * session is also nothing, and the caller is told no more than that — the difference between
 * “never signed in” and “the stored value is unreadable” is the store's business, and a port
 * that is holding neither of them answers the same way to both.
 */
export function parseSession(raw: string | null): Session | null {
  if (raw === null) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // One of this repository's two swallowed errors, and deliberately so: the alternative is a
    // crash whose whole content is a session the app can ask for again. What it must never do
    // is read unreadable data as an account, so it falls through to `null`.
    return null;
  }

  // An array carries no account, and neither does a bare value: only an object with the three
  // fields, each of the shape a session has.
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const { accountId, displayName, expiresAt, issuedAt } = parsed as Record<string, unknown>;

  if (typeof accountId !== 'string' || accountId.trim() === '') {
    return null;
  }

  // The key is always written: a stored value without it is a shape from somewhere else. Its
  // value is either a name or `null`, and nothing in between — an empty or non-string name is
  // what a hand-edit or a truncated write produces, which is not a session (ADR-038).
  const name =
    displayName === null
      ? null
      : typeof displayName === 'string' && displayName.trim() !== ''
        ? displayName
        : undefined;

  if (name === undefined) {
    return null;
  }

  if (!isMoment(issuedAt) || !isMoment(expiresAt)) {
    return null;
  }

  return { accountId, displayName: name, expiresAt, issuedAt };
}

/**
 * Whether the session is over at the moment given. The instant it expires counts as expired:
 * there is no window in which a session is “nearly over but still usable”, because a rule the
 * caller has to interpret is a rule two callers implement differently.
 */
export function isExpired(session: Session, at: Date): boolean {
  return Date.parse(session.expiresAt) <= at.getTime();
}

/** How long the session is still good for, floored at zero — never a negative amount of time. */
export function remainingMilliseconds(session: Session, at: Date): number {
  return Math.max(0, Date.parse(session.expiresAt) - at.getTime());
}
