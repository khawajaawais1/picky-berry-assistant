/**
 * Where a session is kept, as a port.
 *
 * The port exists so that the answer to “where does a session live?” is one decision in one
 * place, and so that the decision can change without the port's callers changing: today an
 * in-memory store holds a stand-in session for as long as the process runs, and the store that
 * holds a real token is ADR-006's **secure-storage adapter** (iOS Keychain / Android Keystore
 * through `expo-secure-store`), which is deliberately not built yet — nothing real is persisted
 * until it is, and a session must never be written to AsyncStorage, a file, a log or a URL.
 *
 * A store keeps a **string** it does not interpret: serialising a session is the port's business
 * and reading it back is `parseSession`'s, so an implementation cannot quietly hand back
 * something the app would read as a different account.
 *
 * Contract, held by `__tests__/store.test.ts` against the in-memory implementation:
 *
 * - `read()` answers `null` when nothing is kept — never a value a caller has to guess at;
 * - `write()` replaces what was there, and rejects if the value could not be kept;
 * - `clear()` leaves nothing behind, and clearing nothing is not an error.
 */
export type SessionStore = {
  read(): Promise<string | null>;
  write(serialised: string): Promise<void>;
  clear(): Promise<void>;
};

/**
 * A store that holds a session in memory and is gone when the process is: the stand-in the app
 * runs on until the account service exists.
 *
 * It keeps the session to **this process**, on **this device**, and sends it nowhere. That is
 * deliberate rather than a limitation to be worked around: ADR-006 forbids credentials in
 * ordinary local storage, and an in-memory session needs no exception to that rule — it is why
 * the stand-in can ship at all before the secure adapter exists. What it costs is stated where a
 * reader will meet it: the session does not survive a reload, so a screen built on the seam
 * cannot be tested against a cold start yet (PROJECT.md).
 *
 * It is a factory rather than a module-level value so two stores are two independent places —
 * a test, or a second port, cannot see the first one's session.
 */
export function createInMemorySessionStore(): SessionStore {
  let held: string | null = null;

  return {
    async read() {
      return held;
    },
    async write(serialised) {
      held = serialised;
    },
    async clear() {
      held = null;
    },
  };
}
