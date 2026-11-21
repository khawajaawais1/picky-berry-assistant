import { deleteAccountEverywhere } from '../delete-account';

/**
 * Deleting the account (ADR-065, the plan's phase 5): first at the service, then on this device.
 * The order is the point. The device keeps its records until the service has deleted the
 * account, and once it has, a device that could not be cleared is said as that, never as
 * "nothing was deleted".
 */
describe('deleteAccountEverywhere', () => {
  it('deletes at the service, then clears the device', async () => {
    const calls: string[] = [];

    const result = await deleteAccountEverywhere('berries1234', {
      deleteAtService: async (password) => {
        calls.push(`service:${password}`);
        return { ok: true };
      },
      clearDevice: async () => {
        calls.push('device');
      },
    });

    expect(result).toEqual({ ok: true });
    expect(calls).toEqual(['service:berries1234', 'device']);
  });

  it.each(['refused', 'unavailable'] as const)(
    'keeps the device as it was when the service answers %s',
    async (reason) => {
      const clearDevice = jest.fn(async () => undefined);

      const result = await deleteAccountEverywhere('x', {
        deleteAtService: async () => ({ ok: false, reason }),
        clearDevice,
      });

      expect(result).toEqual({ ok: false, reason });
      expect(clearDevice).not.toHaveBeenCalled();
    },
  );

  it('says the device was not cleared when the account is gone but the clean-up failed', async () => {
    const result = await deleteAccountEverywhere('x', {
      deleteAtService: async () => ({ ok: true }),
      clearDevice: async () => Promise.reject(new Error('storage will not answer')),
    });

    expect(result).toEqual({ ok: false, reason: 'device-not-cleared' });
  });
});
