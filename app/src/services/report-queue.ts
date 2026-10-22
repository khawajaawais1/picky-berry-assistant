import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The queue of visit reports waiting to reach the server — frame 10's “Save report offline”.
 *
 * The design promises exactly this (“Your visit and report stay on this phone and sync when
 * you're online”), and it is the first half of the offline slice: capture must work without
 * the network (ADR-005). What it deliberately does **not** do is sync: there is no backend,
 * no account and no transport, so an entry stays on this device until something can carry it.
 *
 * Plain storage, deliberately: no React here, so any caller can use it.
 *
 * The four questions AGENTS.md §11 asks of every stored field:
 *
 * - **Who may read it** — this app, on this device. No server call carries it, nothing else on
 *   the device is given access to it, and no third party is involved (ADR-014's processor and
 *   EEA rules are untouched by a local write).
 * - **How the user gets a copy** — **frame 13's sync centre lists it** (`features/offline`, the
 *   screen at `/downloads`), and frame 11's visit history lists it too (`features/discover`, the
 *   season screen at `/visits`). What the app keeps about a visit is therefore readable on the
 *   device that holds it, with the visit's own values. An export is still the missing half of
 *   portability (PROJECT.md carries it), which is why this paragraph names the screen rather than
 *   claiming the field is finished.
 * - **How it is corrected** — the picker's own input is the only content, and the screen that
 *   writes it validates it first. There is no edit path for an entry once queued: the queue is
 *   write-then-sync, and the frame draws no editing.
 * - **How it is deleted** — `clearReportQueue()`, which signing out calls (it is exported and
 *   tested for that purpose), and uninstalling the app, which removes the whole store.
 *
 * Retention: entries are transient by intent — they are removed when the server accepts them
 * (a transport that does not exist yet, ADR-005) — and the 12-month rule (ADR-014) applies to
 * the server-side copy this queue exists to produce, not to the queue itself.
 */

/** Versioned key: a record whose shape changes gets a new key rather than being misread. */
export const REPORT_QUEUE_STORAGE_KEY = 'picky.report-queue.v1';

/** How the picker rated what they found, from frame 10's five options (1 “None” … 5 “Lots”). */
export const YIELD_RATINGS = [1, 2, 3, 4, 5] as const;

export type YieldRating = (typeof YIELD_RATINGS)[number];

/**
 * The scale's own top, for the screens that print a rating as “4 / 5” (frame 13's queued report).
 * Derived from the design's list rather than written out again: when a sixth option arrives, the
 * printed maximum follows it.
 */
export const YIELD_RATING_MAX: YieldRating = YIELD_RATINGS[YIELD_RATINGS.length - 1] as YieldRating;

/** One visit report, as the picker's own screen captures it and the queue keeps it. */
export type VisitReport = {
  /** The zone the visit was in — the design's own identity for it (“Z14”). */
  zoneId: string;
  /** What the picker said they found, 1–5. */
  yieldRating: YieldRating;
  /** The species the report is about, as an identifier the catalogue names. */
  speciesId: string;
  /** What the picker said they harvested, exactly as typed, or `''` when they left it empty. */
  amountText: string;
  /** How long the visit lasted, in whole minutes — what the history rows print beside it. */
  minutes: number;
  /** When the visit ended — the moment the report was saved, ISO-8601. */
  recordedAt: string;
};

/**
 * A report is validated where it enters storage, not where it is typed: this is the boundary,
 * and a stored entry the app could not have produced would be one it cannot later explain.
 */
function validateReport(report: VisitReport): void {
  if (typeof report.zoneId !== 'string' || report.zoneId === '') {
    throw new RangeError('a report needs the zone its visit was in');
  }

  if (typeof report.speciesId !== 'string' || report.speciesId === '') {
    throw new RangeError('a report needs the species it is about');
  }

  if (
    typeof report.yieldRating !== 'number' ||
    !YIELD_RATINGS.includes(report.yieldRating) ||
    !Number.isInteger(report.yieldRating)
  ) {
    throw new RangeError(
      `a yield rating is one of the design's five options (${YIELD_RATINGS.join(', ')}), got ${report.yieldRating}`,
    );
  }

  if (typeof report.amountText !== 'string') {
    throw new RangeError('an amount is the picker’s own text, empty when they skipped it');
  }

  if (!Number.isInteger(report.minutes) || report.minutes < 0) {
    throw new RangeError(`a visit lasts a whole number of minutes, got ${report.minutes}`);
  }

  if (
    typeof report.recordedAt !== 'string' ||
    report.recordedAt === '' ||
    Number.isNaN(Date.parse(report.recordedAt))
  ) {
    throw new RangeError('a report needs the ISO-8601 time it was recorded');
  }
}

/** Reads one stored entry strictly: anything the app cannot understand is not a report. */
function parseReport(value: unknown): VisitReport | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const { amountText, minutes, recordedAt, speciesId, yieldRating, zoneId } = candidate;

  if (
    typeof zoneId !== 'string' ||
    zoneId === '' ||
    typeof speciesId !== 'string' ||
    speciesId === '' ||
    typeof yieldRating !== 'number' ||
    !YIELD_RATINGS.includes(yieldRating as YieldRating) ||
    !Number.isInteger(yieldRating) ||
    typeof amountText !== 'string' ||
    typeof minutes !== 'number' ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    typeof recordedAt !== 'string' ||
    recordedAt === '' ||
    Number.isNaN(Date.parse(recordedAt))
  ) {
    return null;
  }

  return {
    amountText,
    minutes,
    recordedAt,
    speciesId,
    yieldRating: yieldRating as YieldRating,
    zoneId,
  };
}

/**
 * The queued reports, oldest first. A stored value the app cannot understand — a truncated
 * write, a hand-edited file, a shape from another version — reads as an empty queue, and
 * entries individually unreadable are dropped rather than making the whole queue unreadable;
 * what must never happen is a broken entry being read as a report.
 */
export async function readReportQueue(): Promise<VisitReport[]> {
  const raw = await AsyncStorage.getItem(REPORT_QUEUE_STORAGE_KEY);

  if (raw === null) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // The one swallowed error in this module, and deliberately so: the alternative is a crash
    // whose whole content is a queue the app can simply start again.
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map(parseReport).filter((report): report is VisitReport => report !== null);
}

/**
 * Appends a report to the queue and hands back the queue as it now stands. A write that
 * fails rejects: a screen must never tell the picker their report was kept when it wasn't.
 */
export async function enqueueReport(report: VisitReport): Promise<VisitReport[]> {
  validateReport(report);

  const queued = [...(await readReportQueue()), report];

  await AsyncStorage.setItem(REPORT_QUEUE_STORAGE_KEY, JSON.stringify(queued));

  return queued;
}

/** Deletes the whole queue: the user's way out, and what signing out calls. */
export async function clearReportQueue(): Promise<void> {
  await AsyncStorage.removeItem(REPORT_QUEUE_STORAGE_KEY);
}
