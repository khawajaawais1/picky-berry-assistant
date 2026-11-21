import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  VISIT_OUTBOX_STORAGE_KEY,
  addToVisitOutbox,
  clearVisitOutbox,
  readVisitOutbox,
  removeFromVisitOutbox,
  type OutboxVisit,
} from '../visit-outbox';

/**
 * Finished visits waiting to reach `POST /visits` (ADR-066): kept on the device so a visit the
 * network lost, or one finished just before the app closed, is still sent. Each entry is removed
 * once the server has answered it.
 */
const VISIT: OutboxVisit = {
  clientId: '4cd7a7d4-e6da-4d4c-bdbf-d0997c5ac60d',
  zoneId: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
  startedAt: '2026-08-03T09:00:00.000Z',
  endedAt: '2026-08-03T09:45:00.000Z',
};
const OTHER: OutboxVisit = { ...VISIT, clientId: '5cd7a7d4-e6da-4d4c-bdbf-d0997c5ac60d' };

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('the visit outbox', () => {
  it('holds nothing until a visit is added', async () => {
    expect(await readVisitOutbox()).toEqual([]);
  });

  it('keeps added visits, oldest first, across reads', async () => {
    await addToVisitOutbox(VISIT);
    await addToVisitOutbox(OTHER);

    expect(await readVisitOutbox()).toEqual([VISIT, OTHER]);
  });

  it('keeps a visit once however often it is added', async () => {
    await addToVisitOutbox(VISIT);
    await addToVisitOutbox(VISIT);

    expect(await readVisitOutbox()).toEqual([VISIT]);
  });

  it('removes the visit the server answered, and only that one', async () => {
    await addToVisitOutbox(VISIT);
    await addToVisitOutbox(OTHER);

    await removeFromVisitOutbox(VISIT.clientId);

    expect(await readVisitOutbox()).toEqual([OTHER]);
  });

  it('clears everything, which signing out calls', async () => {
    await addToVisitOutbox(VISIT);

    await clearVisitOutbox();

    expect(await AsyncStorage.getItem(VISIT_OUTBOX_STORAGE_KEY)).toBeNull();
  });

  it('reads a stored value it cannot understand as empty, and drops unreadable entries', async () => {
    await AsyncStorage.setItem(VISIT_OUTBOX_STORAGE_KEY, 'not json');
    expect(await readVisitOutbox()).toEqual([]);

    await AsyncStorage.setItem(
      VISIT_OUTBOX_STORAGE_KEY,
      JSON.stringify([VISIT, { clientId: 'x' }, { ...OTHER, startedAt: 'today' }]),
    );
    expect(await readVisitOutbox()).toEqual([VISIT]);
  });

  it('refuses to keep an entry that is not a visit', async () => {
    await expect(addToVisitOutbox({ ...VISIT, zoneId: '' })).rejects.toThrow(RangeError);
  });
});
