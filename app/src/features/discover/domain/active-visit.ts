import { DEMO_ZONE_DETAILS } from './zone-details';

/**
 * What frame 09 (Core picker · Active visit, node `5:23185`) knows while a visit is running:
 * how long the picker has been in the zone and the clock reading they arrived at.
 *
 * Nothing here tracks anything. There is no position source and no visit store, so the
 * figures are the design's own sample, exactly as the zone's score and the route's minutes
 * are; when the visits domain has readings of its own, these functions are what the screen
 * will call with them.
 */

export const DEMO_ACTIVE_VISIT = {
  /** The zone frames 06–08 tell their story about, and the one frame 09's title names. */
  zoneId: DEMO_ZONE_DETAILS.zoneId,
  /** The frame's own reading (node `5:23226`, “00:42:17”): a visit 42 minutes 17 seconds old. */
  elapsedMs: 42 * 60_000 + 17_000,
  /** The frame's own arrival time (node `5:23203`). A fixed demo value, so the static page and
   *  the phone say the same thing; a computed wall clock would differ by the build time. */
  arrival: '10:03',
} as const;

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
