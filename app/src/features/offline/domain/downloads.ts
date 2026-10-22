/**
 * What frame 13 draws about a downloaded region — **the design's own sample**, kept in one place.
 *
 * The frame's sync centre is built around a region that is already on the phone: “Laajavuori
 * region · 12 km² · 86 MB · Downloaded”, the tiles and zones it covers, the forecast saved with
 * them, the storage they take and the moment they last synced. The app has **none of that** — there
 * is no tile cache, no forecast download and no storage measurement, because the basemap is
 * deliberately not built (ADR-031) and known issue 30 records what has to be true before it is.
 *
 * So these numbers are not a reading of anything: they are the design's figures, and the screen
 * that draws them says so on itself (the season-demo disclosure in its eyebrow, and the sentence the
 * screen prints above them). Keeping them here rather than in the component is what makes that
 * checkable: the screen imports them from one named place, the guard test
 * (`discover/components/__tests__/demo-disclosure.test.tsx`) sees the `DEMO_` name and refuses to
 * let the screen drop its disclosure, and the numbers can be asserted against the frame's own
 * figures in one test rather than by reading a component.
 *
 * The frame's figures are internally consistent, and that is asserted rather than assumed: the
 * region's size is the storage it uses (86 MB of 500), which is what the storage meter's 59 px of
 * 342 px is drawing.
 */
export const DEMO_DOWNLOADS = {
  /** How much ground the frame's downloaded region covers, in square kilometres. */
  areaKm2: 12,
  /** How many zones its cached tile set covers, as the frame's own row says (24). */
  zoneCount: 24,
  /** The day the frame's forecast was saved, as an instant the language can format. */
  forecastSavedOn: '2026-08-28T08:00:00.000Z',
  /** The time of day the frame prints beside it — a clock reading, not a moment to localize. */
  forecastSavedAtTime: '08:00',
  /** The day the frame's last successful sync happened, and the time it prints beside it. */
  lastSyncOn: '2026-08-28T08:12:00.000Z',
  lastSyncAtTime: '08:12',
  /** What the region takes on the phone, and what the frame measures it against. */
  storage: { totalMb: 500, usedMb: 86 },
} as const;

/**
 * What the frame's region weighs on the phone, in MB — the same figure its storage line reports.
 * Named separately because both the region's own line and the storage block print it, and two
 * figures that describe one downloaded thing may not disagree.
 */
export const DEMO_REGION_SIZE_MB = DEMO_DOWNLOADS.storage.usedMb;

/** How full the frame's storage meter is drawn, as a fraction of the whole (0–1). */
export function demoStorageShare(): number {
  return DEMO_DOWNLOADS.storage.usedMb / DEMO_DOWNLOADS.storage.totalMb;
}
