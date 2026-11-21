import { act, renderHook, waitFor } from '@testing-library/react-native';

import { accountProfile, fakeAccountApi } from '../../services/testing';
import { useAccountProfile } from '../use-account-profile';

/**
 * The account's own profile, read once per account and shared by every screen that shows a part of
 * it: the alert preferences, the spot visibility, the language and the nickname (ADR-067). A save
 * on one screen is what the others read next, so a screen left underneath on the stack never shows
 * the value it was opened with.
 */
describe('useAccountProfile', () => {
  it('reads nothing without the account service or a signed-in account', async () => {
    const api = fakeAccountApi();

    const without = await renderHook(() => useAccountProfile(undefined, 'aino@example.fi'));
    const signedOut = await renderHook(() => useAccountProfile(api, null));

    expect(without.result.current.status).toBe('none');
    expect(signedOut.result.current.status).toBe('none');
    expect(api.profile).not.toHaveBeenCalled();

    // Leaving holds nothing to let go of.
    await without.unmount();
    await signedOut.unmount();
  });

  it('reads the profile, and answers it once the service has', async () => {
    const api = fakeAccountApi(accountProfile({ alertRadiusKm: 7 }));

    const { result } = await renderHook(() => useAccountProfile(api, 'aino@example.fi'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.profile?.alertRadiusKm).toBe(7);
  });

  it('says the read failed rather than drawing a profile it does not have', async () => {
    const api = fakeAccountApi();
    api.profile.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useAccountProfile(api, 'aino@example.fi'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.profile).toBeNull();
  });

  it('shares one read between the screens that show the same account', async () => {
    const api = fakeAccountApi();

    const first = await renderHook(() => useAccountProfile(api, 'aino@example.fi'));
    const second = await renderHook(() => useAccountProfile(api, 'aino@example.fi'));

    await waitFor(() => expect(second.result.current.status).toBe('ready'));
    expect(first.result.current.status).toBe('ready');
    expect(api.profile).toHaveBeenCalledTimes(1);
  });

  it('hands a saved change to every screen reading the profile', async () => {
    const api = fakeAccountApi(accountProfile({ alertRadiusKm: 3 }));
    const underneath = await renderHook(() => useAccountProfile(api, 'aino@example.fi'));
    const editing = await renderHook(() => useAccountProfile(api, 'aino@example.fi'));
    await waitFor(() => expect(editing.result.current.status).toBe('ready'));

    let outcome: unknown;
    await act(async () => {
      outcome = await editing.result.current.save({ alertRadiusKm: 25 });
    });

    expect(outcome).toEqual({ ok: true });
    expect(api.updateProfile).toHaveBeenCalledWith({ alertRadiusKm: 25 });
    expect(underneath.result.current.profile?.alertRadiusKm).toBe(25);
  });

  it('keeps the profile it had when a save is refused, and says so', async () => {
    const api = fakeAccountApi(accountProfile({ alertRadiusKm: 3 }));
    api.updateProfile.mockResolvedValueOnce({ ok: false, reason: 'unavailable' });
    const { result } = await renderHook(() => useAccountProfile(api, 'aino@example.fi'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.save({ alertRadiusKm: 25 });
    });

    expect(outcome).toEqual({ ok: false, reason: 'unavailable' });
    expect(result.current.profile?.alertRadiusKm).toBe(3);
  });

  it('saves the spot visibility through the privacy endpoint', async () => {
    const api = fakeAccountApi(accountProfile({ privacyLevel: 'private' }));
    const { result } = await renderHook(() => useAccountProfile(api, 'aino@example.fi'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.savePrivacy('public');
    });

    expect(api.updatePrivacy).toHaveBeenCalledWith('public');
    expect(result.current.profile?.privacyLevel).toBe('public');
  });

  it('reads again for another account, and never shows the last one’s profile', async () => {
    const api = fakeAccountApi(accountProfile({ email: 'aino@example.fi' }));
    const { result, rerender } = await renderHook(
      ({ account }: { account: string }) => useAccountProfile(api, account),
      { initialProps: { account: 'aino@example.fi' } },
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));

    api.profile.mockImplementationOnce(() => new Promise(() => {}));
    await rerender({ account: 'matti@example.fi' });

    expect(result.current.profile).toBeNull();
    expect(result.current.status).toBe('loading');
  });
});
