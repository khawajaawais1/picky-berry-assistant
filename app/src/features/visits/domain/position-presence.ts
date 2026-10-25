import type { ZonePresenceSample } from './visit-lifecycle';

/**
 * The join between a position and a visit: what the device's own containment answers mean to the
 * visit tracker (ADR-045).
 *
 * The app's two halves already existed and could not meet. A position arrives from the device
 * (`src/services/location`, behind a port, read only with the picker's consent), and the tracker
 * (`visit-lifecycle.ts`) turns presence samples into visits — but nothing said what a *step* from
 * one containment answer to the next produces. That is this rule, and it is pure so the ordering
 * it decides can be asserted without a device, a zone source or a clock.
 *
 * The order is the point: **a zone that was left is closed before a zone that was entered is
 * opened.** The tracker keeps one open visit per zone and closes a segment on the first
 * `inside: false`, so the other order would report an arrival without the departure that explains
 * it — and a picker walking from one zone into the next would leave the first visit open.
 *
 * What this rule deliberately does not do: it does **not** decide which zone a fix is in — that is
 * `zone-containment.ts`, on real polygon data this app does not have yet (PROJECT.md, known issue
 * 14) — and it does not read a clock, so the instant it stamps is the observation's own, never the
 * moment the app got round to applying it.
 */
export function presenceSamplesFor(
  previousZoneId: string | null,
  nextZoneId: string | null,
  at: number,
): readonly ZonePresenceSample[] {
  if (previousZoneId === nextZoneId) {
    // Staying where they are is still evidence of presence, which is what keeps a visit open while
    // the picker stands in the patch. Staying *outside* every zone is nothing to report: a sample
    // saying “outside Z14” for someone who was never in Z14 would close a visit they never had.
    return nextZoneId === null ? [] : [{ at, inside: true, zoneId: nextZoneId }];
  }

  const samples: ZonePresenceSample[] = [];

  if (previousZoneId !== null) {
    samples.push({ at, inside: false, zoneId: previousZoneId });
  }

  if (nextZoneId !== null) {
    samples.push({ at, inside: true, zoneId: nextZoneId });
  }

  return samples;
}
