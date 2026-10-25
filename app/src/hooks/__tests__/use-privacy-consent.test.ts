import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { readPrivacyConsent, recordPrivacyConsent } from '@/services/privacy-consent';

import { usePrivacyConsent } from '../use-privacy-consent';

/**
 * What the screens see of the stored consent (ADR-020): the decision, whether it is still
 * being read, and whether the device refused to keep it.
 *
 * The state is what makes withdrawal trustworthy: the fix to a failed write is to show
 * what is *stored*, so a switch can never claim a consent that was never kept.
 */
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('usePrivacyConsent', () => {
  it('loads the decision the user already made', async () => {
    await recordPrivacyConsent(true);

    const { result } = await renderHook(() => usePrivacyConsent());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.consent).toEqual({
      visitTracking: true,
      decidedAt: expect.any(String),
    });
  });

  it('reports no consent while it is still reading, so nothing acts on a guess', async () => {
    await recordPrivacyConsent(true);
    const renders: { consent: unknown; loading: boolean }[] = [];

    const { result } = await renderHook(() => {
      const state = usePrivacyConsent();
      renders.push({ consent: state.consent, loading: state.loading });
      return state;
    });

    // The first render is what a screen paints before the store has answered — it must not
    // claim a consent that has not been read yet, which is why the state is recorded per
    // render rather than sampled after the read has already settled.
    expect(renders[0]).toEqual({ consent: null, loading: true });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(renders.at(-1)).toEqual({
      consent: expect.objectContaining({ visitTracking: true }),
      loading: false,
    });
  });

  it('writes the decision and hands it back', async () => {
    const { result } = await renderHook(() => usePrivacyConsent());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.record(true);
    });

    expect(result.current.consent?.visitTracking).toBe(true);
    await expect(readPrivacyConsent()).resolves.toMatchObject({ visitTracking: true });
  });

  it('keeps the truth on screen when the write fails, and says so', async () => {
    const { result } = await renderHook(() => usePrivacyConsent());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // One failing write, and deliberately **no `mockRestore()` afterwards**: restoring a spy
    // over this shared mock resets the mock's own implementation, so every later write in
    // the file would resolve while storing nothing — a green test hiding a broken one.
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage is full'));

    await act(async () => {
      await result.current.record(true);
    });

    // Nothing was stored, so the screen must not show a consent that does not exist — and
    // the failure is reported rather than swallowed.
    expect(result.current.consent).toBeNull();
    expect(result.current.error).toBe(true);
  });

  it('clears the record and reports it as gone', async () => {
    await recordPrivacyConsent(true);
    const { result } = await renderHook(() => usePrivacyConsent());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // The seed has to be visible first, or “cleared” could pass on a record that was never
    // stored.
    expect(result.current.consent).not.toBeNull();

    await act(async () => {
      await result.current.clear();
    });

    expect(result.current.consent).toBeNull();
    await expect(readPrivacyConsent()).resolves.toBeNull();
  });
});
