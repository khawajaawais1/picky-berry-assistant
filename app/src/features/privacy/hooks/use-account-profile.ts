import { useCallback, useEffect, useSyncExternalStore } from 'react';

import type {
  AccountApi,
  AccountProfile,
  PrivacyLevel,
  ProfilePatch,
} from '../services/account-api';

/**
 * The account's own profile, as `GET /me` answered it, shared by every screen that shows a part of
 * it (ADR-067): the alert preferences, the spot visibility, the language and the nickname.
 *
 * One read per account and service, and every save goes through here, so the screen left
 * underneath on the stack reads the value the screen on top just saved. Nothing is persisted: the
 * profile is the service's record, read again on the next launch, and none of it is a record this
 * phone holds (`domain/held-records.ts` lists those).
 */
export type ProfileApi = Pick<AccountApi, 'profile' | 'updateProfile' | 'updatePrivacy'>;

export type ProfileSave = { ok: true } | { ok: false; reason: 'refused' | 'unavailable' };

export type AccountProfileState = {
  /** `none` when there is no service or no account to read. */
  status: 'none' | 'loading' | 'error' | 'ready';
  profile: AccountProfile | null;
  save: (patch: ProfilePatch) => Promise<ProfileSave>;
  savePrivacy: (level: PrivacyLevel) => Promise<ProfileSave>;
};

type Entry = {
  accountId: string;
  status: 'loading' | 'error' | 'ready';
  profile: AccountProfile | null;
};

type Store = {
  entry: Entry | null;
  listeners: Set<() => void>;
};

const stores = new WeakMap<ProfileApi, Store>();

function storeFor(api: ProfileApi): Store {
  let store = stores.get(api);
  if (!store) {
    store = { entry: null, listeners: new Set() };
    stores.set(api, store);
  }
  return store;
}

function publish(store: Store, entry: Entry | null) {
  store.entry = entry;
  for (const listener of store.listeners) listener();
}

function load(api: ProfileApi, store: Store, accountId: string) {
  if (store.entry?.accountId === accountId && store.entry.status !== 'error') return;

  publish(store, { accountId, status: 'loading', profile: null });
  api.profile().then(
    (profile) => {
      if (store.entry?.accountId === accountId) {
        publish(store, { accountId, status: 'ready', profile });
      }
    },
    () => {
      if (store.entry?.accountId === accountId) {
        publish(store, { accountId, status: 'error', profile: null });
      }
    },
  );
}

const NO_STORE: Store = { entry: null, listeners: new Set() };
const readNoEntry = (): Entry | null => null;
const noSubscription = () => () => undefined;
const UNAVAILABLE: ProfileSave = { ok: false, reason: 'unavailable' };

export function useAccountProfile(
  api: ProfileApi | undefined,
  accountId: string | null,
): AccountProfileState {
  const store = api ? storeFor(api) : NO_STORE;

  const subscribe = useCallback(
    (listener: () => void) => {
      if (store === NO_STORE) return noSubscription();
      store.listeners.add(listener);
      return () => store.listeners.delete(listener);
    },
    [store],
  );
  // A static web render has read no profile: its snapshot is none.
  const entry = useSyncExternalStore(subscribe, () => store.entry, readNoEntry);

  useEffect(() => {
    if (api && accountId !== null) load(api, store, accountId);
  }, [api, accountId, store]);

  const save = useCallback(
    async (patch: ProfilePatch): Promise<ProfileSave> => {
      if (!api || accountId === null) return UNAVAILABLE;
      const result = await api.updateProfile(patch);
      if (!result.ok) return result;
      publish(store, { accountId, status: 'ready', profile: result.profile });
      return { ok: true };
    },
    [api, accountId, store],
  );

  const savePrivacy = useCallback(
    async (level: PrivacyLevel): Promise<ProfileSave> => {
      if (!api || accountId === null) return UNAVAILABLE;
      const result = await api.updatePrivacy(level);
      if (!result.ok) return result;
      const current = store.entry;
      if (current?.accountId === accountId && current.profile) {
        publish(store, {
          ...current,
          profile: { ...current.profile, privacyLevel: result.privacyLevel },
        });
      }
      return { ok: true };
    },
    [api, accountId, store],
  );

  if (!api || accountId === null) return { status: 'none', profile: null, save, savePrivacy };

  // Until the effect has asked, or while the store holds another account's answer, this account's
  // profile is being read: a profile is never shown under an account it is not about.
  if (entry === null || entry.accountId !== accountId) {
    return { status: 'loading', profile: null, save, savePrivacy };
  }

  return { status: entry.status, profile: entry.profile, save, savePrivacy };
}
