import { createSecureSessionStore, SESSION_STORE_KEY, type SecureStorage } from '../secure-store';

/**
 * ADR-006's secure-storage adapter for the `SessionStore` port (ADR-065 decision 2): the API's
 * tokens live in the Keychain / Keystore, never in ordinary storage. It must pass the same
 * contract `store.test.ts` holds the in-memory store to, plus the rules only a real store has.
 *
 * The platform module is replaced by a map-backed fake that records the options each call was
 * made with. No native code runs in the suite.
 */
function fakeSecureStorage() {
  const held = new Map<string, string>();

  return {
    held,
    getItemAsync: jest.fn<
      ReturnType<SecureStorage['getItemAsync']>,
      Parameters<SecureStorage['getItemAsync']>
    >(async (key) => held.get(key) ?? null),
    setItemAsync: jest.fn<
      ReturnType<SecureStorage['setItemAsync']>,
      Parameters<SecureStorage['setItemAsync']>
    >(async (key, value) => {
      held.set(key, value);
    }),
    deleteItemAsync: jest.fn<
      ReturnType<SecureStorage['deleteItemAsync']>,
      Parameters<SecureStorage['deleteItemAsync']>
    >(async (key) => {
      held.delete(key);
    }),
  };
}

const UNLOCKED_THIS_DEVICE = 7;

function storeOver(storage = fakeSecureStorage()) {
  return {
    storage,
    store: createSecureSessionStore({ storage, accessible: UNLOCKED_THIS_DEVICE }),
  };
}

describe('createSecureSessionStore', () => {
  describe('the session store contract', () => {
    it('keeps nothing until something is written to it', async () => {
      expect(await storeOver().store.read()).toBeNull();
    });

    it('hands back what was written to it', async () => {
      const { store } = storeOver();

      await store.write('{"accountId":"u1"}');

      expect(await store.read()).toBe('{"accountId":"u1"}');
    });

    it('replaces what was there rather than keeping both', async () => {
      const { store, storage } = storeOver();

      await store.write('first');
      await store.write('second');

      expect(await store.read()).toBe('second');
      expect(storage.held.size).toBe(1);
    });

    it('keeps nothing after it is cleared', async () => {
      const { store } = storeOver();

      await store.write('{"accountId":"u1"}');
      await store.clear();

      expect(await store.read()).toBeNull();
    });

    it('clears without complaining when there is nothing to clear', async () => {
      await expect(storeOver().store.clear()).resolves.toBeUndefined();
    });
  });

  describe('where and how it keeps the session', () => {
    it('writes under the one versioned key, available only while this device is unlocked', async () => {
      const { store, storage } = storeOver();

      await store.write('value');

      expect(storage.setItemAsync).toHaveBeenCalledWith(SESSION_STORE_KEY, 'value', {
        keychainAccessible: UNLOCKED_THIS_DEVICE,
      });
      expect(SESSION_STORE_KEY).toBe('picky.session.v1');
    });

    it('reads and clears with the same options it wrote with', async () => {
      const { store, storage } = storeOver();

      await store.read();
      await store.clear();

      expect(storage.getItemAsync).toHaveBeenCalledWith(SESSION_STORE_KEY, {
        keychainAccessible: UNLOCKED_THIS_DEVICE,
      });
      expect(storage.deleteItemAsync).toHaveBeenCalledWith(SESSION_STORE_KEY, {
        keychainAccessible: UNLOCKED_THIS_DEVICE,
      });
    });

    it('rejects a write the platform would not keep, so no session is reported that is not held', async () => {
      const storage = fakeSecureStorage();
      storage.setItemAsync.mockRejectedValueOnce(new Error('keychain unavailable'));
      const { store } = storeOver(storage);

      await expect(store.write('value')).rejects.toThrow('keychain unavailable');
    });

    it('reads an unreadable keychain entry as nothing held rather than crashing', async () => {
      // A keychain entry the OS cannot decrypt (e.g. restored onto another device) is a session
      // the user can sign in again for. It must never be read as an account.
      const storage = fakeSecureStorage();
      storage.getItemAsync.mockRejectedValueOnce(new Error('decryption failed'));
      const { store } = storeOver(storage);

      expect(await store.read()).toBeNull();
    });
  });
});
