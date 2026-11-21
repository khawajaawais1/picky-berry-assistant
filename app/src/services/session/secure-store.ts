import * as SecureStore from 'expo-secure-store';

import type { SessionStore } from './store';

/**
 * ADR-006's secure-storage adapter for the `SessionStore` port: the team API's access and refresh
 * tokens (ADR-065 decision 2) live in the iOS Keychain / Android Keystore through
 * `expo-secure-store`, and nowhere else.
 *
 * The entry is `WHEN_UNLOCKED_THIS_DEVICE_ONLY` by default. It is readable only while the
 * device is unlocked and is not migrated to another device by a backup restore (ADR-006
 * decision 4). The key is versioned so a future change of shape is a new key, not a misread.
 *
 * Like the in-memory store, it keeps a string it does not interpret. Reading it back is
 * `parseSession`'s job.
 */
export const SESSION_STORE_KEY = 'picky.session.v1';

/** The part of `expo-secure-store` this adapter uses, so a test can hand in a fake. */
export type SecureStorage = Pick<
  typeof SecureStore,
  'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'
>;

export type SecureSessionStoreOptions = {
  storage?: SecureStorage;
  accessible?: SecureStore.KeychainAccessibilityConstant;
};

export function createSecureSessionStore({
  storage = SecureStore,
  accessible = SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}: SecureSessionStoreOptions = {}): SessionStore {
  const options = { keychainAccessible: accessible };

  return {
    async read() {
      try {
        return await storage.getItemAsync(SESSION_STORE_KEY, options);
      } catch {
        // Deliberately swallowed: an entry the OS cannot decrypt (a restore onto another device,
        // a reset keystore) is a session the user can sign in for again. It must never read as
        // an account, and crashing on launch would serve nobody.
        return null;
      }
    },
    async write(serialised) {
      // Not caught: a session the platform would not keep must not be reported as held.
      await storage.setItemAsync(SESSION_STORE_KEY, serialised, options);
    },
    async clear() {
      await storage.deleteItemAsync(SESSION_STORE_KEY, options);
    },
  };
}
