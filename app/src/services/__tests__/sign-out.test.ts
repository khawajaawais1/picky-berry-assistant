import AsyncStorage from '@react-native-async-storage/async-storage';

import { readPrivacyConsent, recordPrivacyConsent } from '../privacy-consent';
import { enqueueReport, readReportQueue } from '../report-queue';
import { readSavedZones, saveZone } from '../saved-zones';
import { sessionPort } from '../session';
import { signOut } from '../sign-out';

/**
 * Leaving the app: the one control on frame 14 that deletes anything.
 *
 * What it removes is the whole of what this device holds of the picker's — the plan they
 * saved, the reports still waiting to sync, the consent they gave — and then the session
 * itself. The order is the part worth holding: a deletion that fails leaves the session in
 * place, so a user is never signed out of an account whose data the app did not manage to
 * remove, and a failure is reported rather than passed over (AGENTS.md §11.4).
 *
 * The record modules' own documentation names this surface as the caller of their `clear`
 * functions (`src/services/report-queue.ts`, `src/services/privacy-consent.ts`,
 * `src/services/saved-zones.ts`); this is where that promise is kept.
 */
const REPORT = {
  amountText: '1.3 kg',
  minutes: 52,
  recordedAt: '2026-08-28T10:55:00.000Z',
  speciesId: 'lingonberry',
  yieldRating: 4 as const,
  zoneId: 'Z14',
};

/** Everything the device holds of the picker's, as the app reads it back. */
async function heldOnThisDevice() {
  return {
    consent: await readPrivacyConsent(),
    reports: await readReportQueue(),
    savedZones: await readSavedZones(),
    session: await sessionPort.current(),
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await sessionPort.signOut();
});

describe('signing out', () => {
  it('removes everything this device holds, and drops the session with it', async () => {
    await recordPrivacyConsent(true);
    await enqueueReport(REPORT);
    await saveZone('Z14');
    await sessionPort.signIn({
      code: '000000',
      displayName: 'Aino Korhonen',
      identifier: 'aino@example.fi',
    });

    await signOut();

    await expect(heldOnThisDevice()).resolves.toEqual({
      consent: null,
      reports: [],
      savedZones: [],
      session: null,
    });
  });

  it('keeps the session when a record could not be deleted, so nothing half-leaves', async () => {
    await recordPrivacyConsent(true);
    await sessionPort.signIn({
      code: '000000',
      displayName: 'Aino Korhonen',
      identifier: 'aino@example.fi',
    });
    // The first deletion fails — a store that will not answer — and deliberately **no
    // `mockRestore()` afterwards**: restoring a spy over this shared mock resets the mock's
    // own implementation, so every later deletion in the file would resolve while removing
    // nothing (the same rule the privacy screen's test records).
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('the store refused'));

    await expect(signOut()).rejects.toThrow('the store refused');

    // The account is still the one being held: a sign-out that could not clear the device must
    // not claim the user has left, and it must not leave them signed out with data behind.
    await expect(sessionPort.current()).resolves.toMatchObject({ accountId: 'aino@example.fi' });
    await expect(readPrivacyConsent()).resolves.toMatchObject({ visitTracking: true });
  });
});
