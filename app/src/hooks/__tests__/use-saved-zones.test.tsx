import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { readSavedZones, saveZone } from '@/services/saved-zones';

import { useSavedZones } from '../use-saved-zones';

/**
 * What a screen sees of the picker's plan (ADR-024): the zones, whether the record is still being
 * read, whether the device refused it, and the two things a control does with it.
 *
 * The state is what makes the bookmark trustworthy: after a failed write it shows what is
 * *stored*, so the control can never claim a zone was saved when the device did not keep it.
 */
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useSavedZones', () => {
  it('loads the plan the picker already made', async () => {
    await saveZone('Z14', 'lingonberry', new Date('2026-10-10T09:30:00.000Z'));

    const { result } = await renderHook(() => useSavedZones());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.zones).toEqual([
      { savedAt: '2026-10-10T09:30:00.000Z', speciesId: 'lingonberry', zoneId: 'Z14' },
    ]);
    expect(result.current.isSaved('Z14')).toBe(true);
    expect(result.current.isSaved('Z09')).toBe(false);
  });

  it('claims no saved zone while the record is still being read', async () => {
    await saveZone('Z14', 'bilberry');
    const renders: boolean[] = [];

    const { result } = await renderHook(() => {
      const state = useSavedZones();
      renders.push(state.isSaved('Z14'));
      return state;
    });

    // The first render is what the screen paints before the store has answered: the control must
    // not claim a plan that has not been read yet.
    expect(renders[0]).toBe(false);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(renders.at(-1)).toBe(true);
  });

  it('saves a zone the picker pressed, then takes it back on the second press', async () => {
    const { result } = await renderHook(() => useSavedZones());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggle('Z09', 'cloudberry');
    });
    expect(result.current.zones.map((zone) => zone.zoneId)).toEqual(['Z09']);
    expect(result.current.isSaved('Z09')).toBe(true);
    // The layer the screen was reading is part of what the press records.
    await expect(readSavedZones()).resolves.toEqual([
      { savedAt: expect.any(String), speciesId: 'cloudberry', zoneId: 'Z09' },
    ]);

    await act(async () => {
      await result.current.toggle('Z09', 'cloudberry');
    });
    expect(result.current.zones).toEqual([]);
    expect(result.current.isSaved('Z09')).toBe(false);
    await expect(readSavedZones()).resolves.toEqual([]);
  });

  it('shows what is stored when the device refuses the write, and says so', async () => {
    await saveZone('Z14', 'bilberry');
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage is full'));

    const { result } = await renderHook(() => useSavedZones());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggle('Z09', 'bilberry');
    });

    // The zone the device refused to keep is not in the plan the screen shows, the one it did
    // keep still is, and the failure is reported rather than swallowed.
    expect(result.current.error).toBe(true);
    expect(result.current.zones.map((zone) => zone.zoneId)).toEqual(['Z14']);
    expect(result.current.isSaved('Z09')).toBe(false);

    jest.restoreAllMocks();
  });

  it('deletes the whole plan when the picker asks for it', async () => {
    await saveZone('Z14', 'bilberry');

    const { result } = await renderHook(() => useSavedZones());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.clear();
    });

    expect(result.current.zones).toEqual([]);
    await expect(readSavedZones()).resolves.toEqual([]);
  });
});
