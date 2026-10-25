import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { appEnvironment, type AppEnvironment } from '@/config/env';

import { enqueueReport, readReportQueue, type VisitReport } from './report-queue';
import { readSavedZones, saveZone, type SavedZone } from './saved-zones';

/**
 * Sample saved spots and queued reports for preview builds.
 *
 * The design's own samples cover the map, the zone sheet, the visit, the alerts and the
 * marketplace, but the picker's **own** plan and queue are real device records: until the zone
 * and report services exist, a fresh preview has nothing to show there. This seed gives those
 * screens two real-looking records once, so a demo can walk the plan, the sync centre and the
 * visit history without the presenter creating them by hand.
 *
 * It is a preview/development nicety, not product data:
 * - it never runs when `EXPO_PUBLIC_APP_ENV=production`;
 * - it never runs on the web (the static export and the browser harness stay untouched);
 * - it writes only when both the plan and the queue are empty, so it cannot overwrite a
 *   picker's own records;
 * - it writes a marker, so signing out (which clears the records) does not silently recreate
 *   them on the next launch.
 *
 * The profile carries a short notice saying a preview may start with samples
 * (`privacy.previewSample`), so the records are not passed off as the picker's own.
 */

export const DEMO_SEED_STORAGE_KEY = 'picky.demo-seed.v1';

/** Two spots from the pilot stub, under the layers the design's own card and list use. */
type DemoPlanEntry = SavedZone & { speciesId: string };

export const DEMO_SAVED_PLAN: readonly DemoPlanEntry[] = [
  {
    zoneId: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
    speciesId: 'lingonberry',
    savedAt: '2026-08-28T09:20:00+03:00',
  },
  {
    zoneId: 'a2f83130-4d9a-5133-ba7e-83444d71e848',
    speciesId: 'bilberry',
    savedAt: '2026-08-24T11:05:00+03:00',
  },
];

/** Two visits matching the design's 28 Aug sample week and the stub zones above. */
export const DEMO_QUEUE: readonly VisitReport[] = [
  {
    zoneId: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
    speciesId: 'lingonberry',
    yieldRating: 4,
    amountText: '1.3',
    minutes: 52,
    recordedAt: '2026-08-28T10:55:00+03:00',
  },
  {
    zoneId: 'a2f83130-4d9a-5133-ba7e-83444d71e848',
    speciesId: 'bilberry',
    yieldRating: 3,
    amountText: '0.8',
    minutes: 41,
    recordedAt: '2026-08-24T12:30:00+03:00',
  },
];

export type DemoSeedOptions = {
  /** The app's environment; defaults to the declared public environment. */
  environment?: AppEnvironment;
  /** The platform; defaults to the current one. The web harness never seeds. */
  platform?: string;
};

/**
 * Writes the sample records once, when the phone holds none. Resolves `true` when it seeded,
 * `false` when it was gated, already marked or found existing records. A storage failure
 * rejects: the caller may continue, because an empty preview is still usable.
 */
export async function seedDemoData({
  environment = appEnvironment(),
  platform = Platform.OS,
}: DemoSeedOptions = {}): Promise<boolean> {
  if (environment === 'production' || platform === 'web') {
    return false;
  }

  if ((await AsyncStorage.getItem(DEMO_SEED_STORAGE_KEY)) !== null) {
    return false;
  }

  const [saved, reports] = await Promise.all([readSavedZones(), readReportQueue()]);

  if (saved.length + reports.length > 0) {
    // Someone already used this install. Mark it so a later sign-out does not look like a
    // first launch and seed over the empty record.
    await AsyncStorage.setItem(DEMO_SEED_STORAGE_KEY, '1');
    return false;
  }

  for (const plan of DEMO_SAVED_PLAN) {
    await saveZone(plan.zoneId, plan.speciesId, new Date(plan.savedAt));
  }

  for (const report of DEMO_QUEUE) {
    await enqueueReport(report);
  }

  await AsyncStorage.setItem(DEMO_SEED_STORAGE_KEY, '1');
  return true;
}
