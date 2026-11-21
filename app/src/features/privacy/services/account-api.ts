import type { ApiClient, ApiFailure } from '@/services/api';

/**
 * The account endpoints of the team API (ADR-065, the API integration plan's phase 5):
 *
 * - `profile` — `GET /me`, which is what the account row reads its verification line from;
 * - `exportData` — `POST /me/export`, the service's own copy of the account's data, answered as
 *   a readable JSON document for the share sheet;
 * - `deleteAccount` — `DELETE /me` with the account's password. The server deletes the account
 *   and anonymises its data, and the caller then clears the device.
 *
 * A wrong password is a 401. The transport answers a 401 with one refresh and one retry, which
 * meets the same refusal and ends as `unauthenticated`, so that kind reads as `refused` here
 * rather than as a lost session.
 */
export type AccountProfile = {
  email: string;
  emailVerified: boolean;
  nickname: string | null;
  lang: 'fi' | 'en';
};

export type DeleteAccountResult = { ok: true } | { ok: false; reason: 'refused' | 'unavailable' };

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
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseProfile(body: unknown): AccountProfile | null {
  if (!isRecord(body)) return null;

  const { email, email_verified: verified, nickname, lang } = body;
  if (typeof email !== 'string' || email.trim() === '' || typeof verified !== 'boolean') {
    return null;
  }
  if (nickname !== null && typeof nickname !== 'string') return null;
  if (lang !== 'fi' && lang !== 'en') return null;

  return { email, emailVerified: verified, nickname, lang };
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

      const { error } = result;
      const refused =
        error.kind === 'unauthenticated' ||
        (error.kind === 'http' && error.status >= 400 && error.status < 500);
      return { ok: false, reason: refused ? 'refused' : 'unavailable' };
    },
  };
}
