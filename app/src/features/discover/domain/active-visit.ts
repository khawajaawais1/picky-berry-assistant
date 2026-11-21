/**
 * The readings screens 09 and 10 print for a tracked visit, and the two shapes the tracker's
 * store publishes to them. Nothing here tracks anything: the values come from the visits feature.
 */

/** A tracked visit as the two visit screens read it. */
export type VisitSnapshot = {
  visitId: string;
  zoneId: string;
  zoneName: string;
  openedAt: number;
  endedAt: number | null;
};

/** An entry that has not yet met the visit policy's dwell minimum. */
export type CandidateSnapshot = {
  zoneId: string;
  zoneName: string;
  enteredAt: number;
};

const pad2 = (value: number) => String(value).padStart(2, '0');

/**
 * How long the visit has been running, as the frame prints it: zero-padded hours, minutes and
 * seconds (“00:42:17”). Hours keep counting past a day, because the visit policy allows a visit
 * to span one (PROJECT.md, decision 16).
 *
 * Part-seconds truncate rather than round: a timer that rounded up would show a second the clock
 * has not reached yet.
 */
export function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new RangeError(`an elapsed time is a non-negative number of milliseconds, got ${ms}`);
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

/**
 * The device's wall clock as the frame prints it (“10:03”, node `5:23203`): 24-hour and local,
 * because it is the picker's own arrival the status message names, not a server timestamp.
 */
export function formatClockTime(epochMs: number): string {
  if (!Number.isFinite(epochMs)) {
    throw new RangeError(`a clock time is a finite epoch timestamp, got ${epochMs}`);
  }

  const date = new Date(epochMs);

  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
