/**
 * The visit policy: the server-owned rule set that decides when presence becomes a
 * visit. Values are tuned server-side, never by shipping an app build, and the
 * policy carries a version so a decision made offline can be reconciled later.
 *
 * The server payload is external input, so it is validated here rather than
 * trusted (SECURITY.md §4).
 */

export type VisitPolicy = {
  /** Identifies the rule set a decision was made under. */
  version: string;
  /** Minimum continuous time inside a zone before an entry counts as a visit. */
  dwellMs: number;
  /** How long after leaving, re-entering continues the same visit. */
  graceMs: number;
  /** Maximum number of local days one visit may touch. */
  maxVisitSpanDays: number;
};

/** Defaults agreed by the owner on 2026-10-08: 5 min dwell, 30 min grace, one day. */
export const DEFAULT_VISIT_POLICY: VisitPolicy = {
  version: 'default-1',
  dwellMs: 5 * 60_000,
  graceMs: 30 * 60_000,
  maxVisitSpanDays: 1,
};

const MAX_DURATION_MS = 86_400_000;
const MAX_SPAN_DAYS = 7;
const MAX_VERSION_LENGTH = 64;

export type VisitPolicyParseResult =
  { ok: true; policy: VisitPolicy } | { ok: false; problems: readonly string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseVersion(value: unknown, problems: string[]): string | null {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > MAX_VERSION_LENGTH) {
    problems.push(`version must be a non-empty string of at most ${MAX_VERSION_LENGTH} characters`);
    return null;
  }
  return value;
}

function parseDuration(value: unknown, field: string, problems: string[]): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value <= 0 ||
    value > MAX_DURATION_MS
  ) {
    problems.push(
      `${field} must be a whole number of milliseconds between 1 and ${MAX_DURATION_MS}`,
    );
    return null;
  }
  return value;
}

function parseSpanDays(value: unknown, problems: string[]): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_SPAN_DAYS) {
    problems.push(`maxVisitSpanDays must be a whole number between 1 and ${MAX_SPAN_DAYS}`);
    return null;
  }
  return value;
}

/**
 * Validates a policy payload, reporting **every** problem at once so a
 * misconfigured server can be diagnosed in one pass. Unknown fields are dropped
 * rather than echoed, so a payload can never smuggle state into the client.
 */
export function parseVisitPolicy(raw: unknown): VisitPolicyParseResult {
  if (!isRecord(raw)) {
    return { ok: false, problems: ['visit policy must be an object'] };
  }

  const problems: string[] = [];
  const version = parseVersion(raw.version, problems);
  const dwellMs = parseDuration(raw.dwellMs, 'dwellMs', problems);
  const graceMs = parseDuration(raw.graceMs, 'graceMs', problems);
  const maxVisitSpanDays = parseSpanDays(raw.maxVisitSpanDays, problems);

  if (version === null || dwellMs === null || graceMs === null || maxVisitSpanDays === null) {
    return { ok: false, problems };
  }

  return { ok: true, policy: { version, dwellMs, graceMs, maxVisitSpanDays } };
}
