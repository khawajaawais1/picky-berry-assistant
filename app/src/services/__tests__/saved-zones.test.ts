import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  SAVED_ZONES_STORAGE_KEY,
  clearSavedZones,
  readSavedZones,
  removeSavedZone,
  saveZone,
} from '../saved-zones';

/**
 * The record behind frame 07's “Save zone” control.
 *
 * It is the picker's own plan — which zones they mean to walk to — kept on the device and sent
 * nowhere. It is a *record* rather than a screen's state because the same control has to be able
 * to show it back and to take it away again: the four questions AGENTS.md §11 asks of every
 * stored field (who may read it, how the user gets a copy, how it is corrected, how it is
 * deleted) are answered by the control itself. A shape the app cannot read is **no saved zones**,
 * never a saved zone the picker did not save.
 */
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('the stored saved zones', () => {
  it('is empty until the picker has saved something', async () => {
    await expect(readSavedZones()).resolves.toEqual([]);
  });

  it('keeps its own version, so a changed shape is a new key and not a misread old one', () => {
    expect(SAVED_ZONES_STORAGE_KEY).toBe('picky.saved-zones.v1');
  });

  it('records which zone was saved, under which berry, and when', async () => {
    const savedAt = new Date('2026-10-10T09:30:00.000Z');

    const saved = await saveZone('Z14', 'lingonberry', savedAt);

    expect(saved).toEqual([
      { savedAt: '2026-10-10T09:30:00.000Z', speciesId: 'lingonberry', zoneId: 'Z14' },
    ]);
    await expect(readSavedZones()).resolves.toEqual(saved);
    await expect(AsyncStorage.getItem(SAVED_ZONES_STORAGE_KEY)).resolves.toBe(
      JSON.stringify(saved),
    );
  });

  it('keeps the zones in the order they were saved', async () => {
    await saveZone('Z14', 'bilberry', new Date('2026-10-10T09:30:00.000Z'));
    await saveZone('Z09', 'cloudberry', new Date('2026-10-10T09:31:00.000Z'));

    await expect(readSavedZones()).resolves.toEqual([
      { savedAt: '2026-10-10T09:30:00.000Z', speciesId: 'bilberry', zoneId: 'Z14' },
      { savedAt: '2026-10-10T09:31:00.000Z', speciesId: 'cloudberry', zoneId: 'Z09' },
    ]);
  });

  it('holds one entry per zone when the same zone is saved twice', async () => {
    // The control that calls this is a toggle, so this is the second press of a stale screen
    // rather than a second save: the record stays as it is instead of gaining a duplicate — and
    // the berry it was first saved under stays with it.
    await saveZone('Z14', 'bilberry', new Date('2026-10-10T09:30:00.000Z'));

    const saved = await saveZone('Z14', 'lingonberry', new Date('2026-10-10T11:00:00.000Z'));

    expect(saved).toEqual([
      { savedAt: '2026-10-10T09:30:00.000Z', speciesId: 'bilberry', zoneId: 'Z14' },
    ]);
  });

  it('takes one zone back out and leaves the others', async () => {
    await saveZone('Z14', 'bilberry', new Date('2026-10-10T09:30:00.000Z'));
    await saveZone('Z09', 'lingonberry', new Date('2026-10-10T09:31:00.000Z'));

    const remaining = await removeSavedZone('Z14');

    expect(remaining).toEqual([
      { savedAt: '2026-10-10T09:31:00.000Z', speciesId: 'lingonberry', zoneId: 'Z09' },
    ]);
    await expect(readSavedZones()).resolves.toEqual(remaining);
  });

  it('is quiet about removing a zone that was not saved', async () => {
    await saveZone('Z14', 'bilberry', new Date('2026-10-10T09:30:00.000Z'));

    await expect(removeSavedZone('Z21')).resolves.toEqual([
      { savedAt: '2026-10-10T09:30:00.000Z', speciesId: 'bilberry', zoneId: 'Z14' },
    ]);
  });

  it('deletes the whole record, which is the user’s way out', async () => {
    await saveZone('Z14', 'bilberry', new Date('2026-10-10T09:30:00.000Z'));

    await clearSavedZones();

    await expect(readSavedZones()).resolves.toEqual([]);
    await expect(AsyncStorage.getItem(SAVED_ZONES_STORAGE_KEY)).resolves.toBeNull();
  });

  it('refuses a zone or a berry the app could not have saved', async () => {
    await expect(saveZone('', 'bilberry')).rejects.toThrow(RangeError);
    await expect(saveZone('Z14', '')).rejects.toThrow(RangeError);
    await expect(removeSavedZone('')).rejects.toThrow(RangeError);
  });

  it('reads a value it cannot understand as no saved zones', async () => {
    for (const unreadable of ['not json at all', '{"zoneId":"Z14"}', 'null', '"Z14"', '42']) {
      await AsyncStorage.setItem(SAVED_ZONES_STORAGE_KEY, unreadable);

      await expect(readSavedZones()).resolves.toEqual([]);
    }
  });

  it('drops an entry it cannot read rather than the whole record', async () => {
    await AsyncStorage.setItem(
      SAVED_ZONES_STORAGE_KEY,
      JSON.stringify([
        { savedAt: '2026-10-10T09:30:00.000Z', speciesId: 'bilberry', zoneId: 'Z14' },
        { zoneId: 'Z09' },
        { savedAt: 'yesterday', speciesId: 'bilberry', zoneId: 'Z21' },
        { savedAt: '2026-10-10T09:31:00.000Z', speciesId: 'bilberry', zoneId: '' },
      ]),
    );

    await expect(readSavedZones()).resolves.toEqual([
      { savedAt: '2026-10-10T09:30:00.000Z', speciesId: 'bilberry', zoneId: 'Z14' },
    ]);
  });

  it('reads a plan written before the berry was kept, with no layer claimed for it', async () => {
    // The widening is additive, so an old entry still means its zone and its moment. It does not
    // gain a berry it never stored: `null` is the app saying the record does not name one, and
    // the plan shows the layer it always did (ADR-061).
    await AsyncStorage.setItem(
      SAVED_ZONES_STORAGE_KEY,
      JSON.stringify([{ savedAt: '2026-10-10T09:30:00.000Z', zoneId: 'Z14' }]),
    );

    await expect(readSavedZones()).resolves.toEqual([
      { savedAt: '2026-10-10T09:30:00.000Z', speciesId: null, zoneId: 'Z14' },
    ]);
  });

  it('does not read a blank berry as one', async () => {
    await AsyncStorage.setItem(
      SAVED_ZONES_STORAGE_KEY,
      JSON.stringify([{ savedAt: '2026-10-10T09:30:00.000Z', speciesId: '  ', zoneId: 'Z14' }]),
    );

    await expect(readSavedZones()).resolves.toEqual([
      { savedAt: '2026-10-10T09:30:00.000Z', speciesId: null, zoneId: 'Z14' },
    ]);
  });

  it('rejects a write the device refuses, so no screen claims a zone was saved', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage is full'));

    await expect(saveZone('Z14', 'bilberry')).rejects.toThrow('storage is full');

    jest.restoreAllMocks();
  });
});
