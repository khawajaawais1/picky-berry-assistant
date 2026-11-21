import { failureVerdict, type ApiClient, type ApiFailure } from '@/services/api';

/**
 * The account endpoints of the team API (ADR-065, the API integration plan's phase 5):
 *
 * - `profile` — `GET /me`, which is what the account row reads its verification line from;
 * - `exportData` — `POST /me/export`, the service's own copy of the account's data, answered as
 *   a readable JSON document for the share sheet;
 * - `deleteAccount` — `DELETE /me` with the account's password. The server deletes the account
 *   and anonymises its data, and the caller then clears the device;
 * - `updateProfile` — `PATCH /me`: the nickname, the alert radius, the species the alerts are
 *   about and the account's language (ADR-067);
 * - `updatePrivacy` — `PATCH /me/privacy`: the default spot visibility. Background location is
 *   never sent, because the app reads no position in the background (ADR-056);
 * - `registerDevice` — `POST /me/devices`: this phone's push token (ADR-067).
 *
 * A wrong password is a 401. The transport answers a 401 with one refresh and one retry, which
 * meets the same refusal and ends as `unauthenticated`, so that kind reads as `refused` here
 * rather than as a lost session.
 */
export const PRIVACY_LEVELS = ['private', 'shared', 'public'] as const;

export type PrivacyLevel = (typeof PRIVACY_LEVELS)[number];

export type AccountLanguage = 'fi' | 'en';

/** The bounds `PATCH /me` holds the alert radius to, in whole kilometres. */
export const ALERT_RADIUS_KM = { min: 1, max: 100 } as const;

/** The longest nickname `PATCH /me` accepts. */
export const NICKNAME_MAX_LENGTH = 30;

export type AccountProfile = {
  email: string;
  emailVerified: boolean;
  nickname: string | null;
  lang: AccountLanguage;
  alertRadiusKm: number;
  /** Species codes as the service sent them. Which of them the app can name is the reader's. */
  speciesInterest: string[];
  privacyLevel: PrivacyLevel;
};

export type ProfilePatch = {
  nickname?: string;
  alertRadiusKm?: number;
  speciesInterest?: readonly string[];
  lang?: AccountLanguage;
};

type Refusal = { ok: false; reason: 'refused' | 'unavailable' };

export type DeleteAccountResult = { ok: true } | Refusal;
export type UpdateProfileResult = { ok: true; profile: AccountProfile } | Refusal;
export type UpdatePrivacyResult = { ok: true; privacyLevel: PrivacyLevel } | Refusal;
export type RegisterDeviceResult = { ok: true } | Refusal;

export type DeviceRegistration = {
  /** The platform's own push token: FCM on Android, APNs on iOS. */
  token: string;
  platform: 'ios' | 'android';
  appVersion?: string;
};

export class AccountReadError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(`the account could not be read (${failure.kind})`);
    this.name = 'AccountReadError';
  }
}

export type AccountApi = {
  profile(): Promise<AccountProfile>;
  exportData(): Promise<string>;
  deleteAccount(password: string): Promise<DeleteAccountResult>;
  updateProfile(patch: ProfilePatch): Promise<UpdateProfileResult>;
  updatePrivacy(level: PrivacyLevel): Promise<UpdatePrivacyResult>;
  registerDevice(device: DeviceRegistration): Promise<RegisterDeviceResult>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseProfile(body: unknown): AccountProfile | null {
  if (!isRecord(body)) return null;

  const {
    email,
    email_verified: verified,
    nickname,
    lang,
    alert_radius_km: radius,
    species_interest: species,
    privacy_level: privacyLevel,
  } = body;
  if (typeof email !== 'string' || email.trim() === '' || typeof verified !== 'boolean') {
    return null;
  }
  if (nickname !== null && typeof nickname !== 'string') return null;
  if (lang !== 'fi' && lang !== 'en') return null;
  if (!isRadius(radius)) return null;
  if (!Array.isArray(species) || !species.every((code) => typeof code === 'string')) return null;
  if (!isPrivacyLevel(privacyLevel)) return null;

  return {
    email,
    emailVerified: verified,
    nickname,
    lang,
    alertRadiusKm: radius,
    speciesInterest: [...(species as string[])],
    privacyLevel,
  };
}

function isRadius(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= ALERT_RADIUS_KM.min &&
    value <= ALERT_RADIUS_KM.max
  );
}

export function isPrivacyLevel(value: unknown): value is PrivacyLevel {
  return typeof value === 'string' && (PRIVACY_LEVELS as readonly string[]).includes(value);
}

/** The patch in the contract's words, or a `RangeError` for one the service would refuse. */
function patchBody(patch: ProfilePatch): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (patch.nickname !== undefined) {
    const nickname = patch.nickname.trim();
    if (nickname === '' || nickname.length > NICKNAME_MAX_LENGTH) {
      throw new RangeError(`a nickname is 1–${NICKNAME_MAX_LENGTH} characters`);
    }
    body.nickname = nickname;
  }
  if (patch.alertRadiusKm !== undefined) {
    if (!isRadius(patch.alertRadiusKm)) {
      throw new RangeError(
        `an alert radius is ${ALERT_RADIUS_KM.min}–${ALERT_RADIUS_KM.max} whole kilometres`,
      );
    }
    body.alert_radius_km = patch.alertRadiusKm;
  }
  if (patch.speciesInterest !== undefined) body.species_interest = [...patch.speciesInterest];
  if (patch.lang !== undefined) body.lang = patch.lang;

  if (Object.keys(body).length === 0) throw new RangeError('a profile update changes something');
  return body;
}

function refusal(error: ApiFailure): Refusal {
  return { ok: false, reason: failureVerdict(error) === 'refused' ? 'refused' : 'unavailable' };
}

function parsePrivacy(body: unknown): PrivacyLevel | null {
  return isRecord(body) && isPrivacyLevel(body.privacy_level) ? body.privacy_level : null;
}

const EXPORT_SECTIONS = ['profile', 'consents', 'devices', 'visits', 'reports'] as const;

/** The export as the server sent it, if it has every section `PersonalDataExport` names. */
function exportDocument(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body.profile)) return null;
  if (!EXPORT_SECTIONS.slice(1).every((section) => Array.isArray(body[section]))) return null;

  return JSON.stringify(body, null, 2);
}

export function createAccountApi({ client }: { client: ApiClient }): AccountApi {
  return {
    async profile() {
      const result = await client.request({ method: 'GET', path: '/me', parse: parseProfile });
      if (!result.ok) throw new AccountReadError(result.error);
      return result.data;
    },

    async exportData() {
      const result = await client.request({
        method: 'POST',
        path: '/me/export',
        parse: exportDocument,
      });
      if (!result.ok) throw new AccountReadError(result.error);
      return result.data;
    },

    async deleteAccount(password) {
      if (password === '') throw new RangeError('deleting an account takes its password');

      const result = await client.request({
        method: 'DELETE',
        path: '/me',
        body: { password },
        parse: () => true,
      });

      if (result.ok) return { ok: true };

      // A wrong password is a 401 the transport cannot renew, so here a lost session is the
      // refusal too; a throttle or a missing route says nothing about the password.
      const { error } = result;
      const refused = error.kind === 'unauthenticated' || failureVerdict(error) === 'refused';
      return { ok: false, reason: refused ? 'refused' : 'unavailable' };
    },

    async updateProfile(patch) {
      const result = await client.request({
        method: 'PATCH',
        path: '/me',
        body: patchBody(patch),
        parse: parseProfile,
      });

      return result.ok ? { ok: true, profile: result.data } : refusal(result.error);
    },

    async updatePrivacy(level) {
      const result = await client.request({
        method: 'PATCH',
        path: '/me/privacy',
        body: { privacy_level: level },
        parse: parsePrivacy,
      });

      return result.ok ? { ok: true, privacyLevel: result.data } : refusal(result.error);
    },

    async registerDevice({ token, platform, appVersion }) {
      if (token === '') throw new RangeError('a device registration carries its push token');

      const body: Record<string, string> = { fcm_token: token, platform };
      if (appVersion !== undefined) body.app_version = appVersion;

      const result = await client.request({
        method: 'POST',
        path: '/me/devices',
        body,
        expectsBody: false,
        parse: () => true,
      });

      return result.ok ? { ok: true } : refusal(result.error);
    },
  };
}
