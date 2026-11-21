import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { fakePushPort } from '@/services/push/testing';

import { usePushAlerts, usePushRegistration } from '../use-push-alerts';

/**
 * Frame 12's “Ripe-berry push alerts” switch, made real (ADR-067): its state is the platform's
 * permission, turning it on asks for that permission and registers this phone, and turning it off
 * is the platform's own switch, which the app opens.
 */
function captureAppState() {
  let listener: ((state: AppStateStatus) => void) | null = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
    listener = handler as (state: AppStateStatus) => void;
    return { remove: jest.fn() };
  });
  return { become: async (state: AppStateStatus) => act(async () => listener?.(state)) };
}

afterEach(() => jest.restoreAllMocks());

describe('usePushAlerts', () => {
  it('reads the platform’s permission without asking for it', async () => {
    const push = fakePushPort({ permission: 'granted' });

    const { result } = await renderHook(() => usePushAlerts({ push, register: jest.fn() }));

    await waitFor(() => expect(result.current.status).toBe('on'));
    expect(push.request).not.toHaveBeenCalled();
  });

  it.each([
    ['undetermined', 'off'],
    ['denied', 'denied'],
    ['unsupported', 'unsupported'],
  ] as const)('reads a %s permission as %s', async (permission, status) => {
    const { result } = await renderHook(() =>
      usePushAlerts({ push: fakePushPort({ permission }), register: jest.fn() }),
    );

    await waitFor(() => expect(result.current.status).toBe(status));
  });

  it('asks for the permission when turned on, and registers this phone once it is granted', async () => {
    const push = fakePushPort({ permission: 'undetermined', afterRequest: 'granted' });
    const register = jest.fn(async () => ({ ok: true }));
    const { result } = await renderHook(() => usePushAlerts({ push, register }));
    await waitFor(() => expect(result.current.status).toBe('off'));

    await act(async () => result.current.turnOn());

    expect(push.request).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({ token: 'token-1', platform: 'ios' });
    expect(result.current.status).toBe('on');
    expect(result.current.registration).toBe('registered');
  });

  it('stays off, registering nothing, when the picker refuses the permission', async () => {
    const push = fakePushPort({ permission: 'undetermined', afterRequest: 'denied' });
    const register = jest.fn();
    const { result } = await renderHook(() => usePushAlerts({ push, register }));
    await waitFor(() => expect(result.current.status).toBe('off'));

    await act(async () => result.current.turnOn());

    expect(result.current.status).toBe('denied');
    expect(register).not.toHaveBeenCalled();
  });

  it('says when this phone could not be registered', async () => {
    const push = fakePushPort({ permission: 'undetermined', token: null });
    const { result } = await renderHook(() => usePushAlerts({ push, register: jest.fn() }));
    await waitFor(() => expect(result.current.status).toBe('off'));

    await act(async () => result.current.turnOn());

    expect(result.current.registration).toBe('no-token');
  });

  it('reads the permission again when the picker comes back from the phone’s settings', async () => {
    const appState = captureAppState();
    const push = fakePushPort({ permission: 'granted' });
    const { result } = await renderHook(() => usePushAlerts({ push, register: jest.fn() }));
    await waitFor(() => expect(result.current.status).toBe('on'));

    push.setPermission('denied');
    await appState.become('active');

    await waitFor(() => expect(result.current.status).toBe('denied'));
  });

  it('opens the platform’s settings, where alerts are turned off', async () => {
    const push = fakePushPort({ permission: 'granted' });
    const { result } = await renderHook(() => usePushAlerts({ push, register: jest.fn() }));

    await act(async () => result.current.openSettings());

    expect(push.openSettings).toHaveBeenCalledTimes(1);
  });
});

describe('usePushRegistration', () => {
  it('registers this phone for a signed-in account whose alerts are allowed', async () => {
    const push = fakePushPort({ permission: 'granted' });
    const register = jest.fn(async () => ({ ok: true }));

    await renderHook(() => usePushRegistration({ push, register, accountId: 'aino@example.fi' }));

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
  });

  it('registers nothing without an account, and never asks for the permission', async () => {
    const push = fakePushPort({ permission: 'granted' });
    const register = jest.fn();

    await renderHook(() => usePushRegistration({ push, register, accountId: null }));

    await waitFor(() => expect(push.permission).not.toHaveBeenCalled());
    expect(register).not.toHaveBeenCalled();
    expect(push.request).not.toHaveBeenCalled();
  });

  it('registers again for the next account signed in on this phone', async () => {
    const push = fakePushPort({ permission: 'granted' });
    const register = jest.fn(async () => ({ ok: true }));
    const { rerender } = await renderHook(
      ({ accountId }: { accountId: string | null }) =>
        usePushRegistration({ push, register, accountId }),
      { initialProps: { accountId: 'aino@example.fi' as string | null } },
    );
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));

    await rerender({ accountId: 'matti@example.fi' });

    await waitFor(() => expect(register).toHaveBeenCalledTimes(2));
  });
});
