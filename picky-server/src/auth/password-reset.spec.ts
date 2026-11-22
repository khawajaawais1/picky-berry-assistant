import { UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { DbService } from '../db/db.service';
import { PasswordService } from './password.service';

/**
 * Password reset (OWASP Forgot Password Cheat Sheet): a request answers the same whether or not
 * the address has an account; the token is random, stored hashed, single use and short-lived;
 * confirming it sets the new password and signs every device out.
 */
const USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'picker@example.com',
};

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

type Query = jest.Mock<
  Promise<{ rows: unknown[]; rowCount?: number }>,
  [string, unknown[]?]
>;

function database(answers: (sql: string) => { rows: unknown[] } | undefined) {
  const query: Query = jest.fn((sql: string) =>
    Promise.resolve(answers(sql) ?? { rows: [] }),
  );
  const client = { query, release: jest.fn() };
  return {
    client,
    db: {
      pool: { query, connect: jest.fn(() => Promise.resolve(client)) },
    } as unknown as DbService,
  };
}

function service(db: DbService, passwords: Partial<PasswordService> = {}) {
  const mail = { sendVerification: jest.fn(), sendPasswordReset: jest.fn() };
  const config = {
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
  };
  const auth = new AuthService(
    db,
    passwords as PasswordService,
    { signAsync: jest.fn() } as never,
    config as never,
    mail as never,
  );
  return { auth, mail };
}

const statements = (query: Query) =>
  query.mock.calls.map(([sql]) => sql.replace(/\s+/g, ' '));

describe('AuthService password reset', () => {
  describe('requestPasswordReset', () => {
    it('answers an unknown address the same, and mails nothing', async () => {
      const { client, db } = database(() => undefined);
      const { auth, mail } = service(db);

      await expect(
        auth.requestPasswordReset({ email: 'Nobody@Example.com' }),
      ).resolves.toBeUndefined();

      expect(mail.sendPasswordReset).not.toHaveBeenCalled();
      expect(
        statements(client.query).some((sql) =>
          sql.includes('INSERT INTO email_tokens'),
        ),
      ).toBe(false);
    });

    it('stores only the token’s hash, for an hour, and mails the token itself', async () => {
      const { client, db } = database((sql) =>
        sql.includes('FROM users') ? { rows: [USER] } : undefined,
      );
      const { auth, mail } = service(db);

      await auth.requestPasswordReset({ email: ' Picker@Example.com ' });

      const insert = client.query.mock.calls.find(([sql]) =>
        sql.includes('INSERT INTO email_tokens'),
      )!;
      expect(insert[0]).toContain("'reset_password'");
      expect(insert[0]).toContain("interval '1 hour'");
      const [userId, email, link] = mail.sendPasswordReset.mock.calls[0] as [
        string,
        string,
        string,
      ];
      expect([userId, email]).toEqual([USER.id, USER.email]);
      const token = new URL(link).searchParams.get('token')!;
      expect(token.length).toBeGreaterThanOrEqual(43);
      // The token is 32 random bytes, so a fast digest is the right store for it (OWASP Forgot
      // Password Cheat Sheet); the lookup's own hashing is pinned by the confirm test below.
      const [storedUser, storedHash] = insert[1] as [string, string];
      expect(storedUser).toBe(USER.id);
      expect(storedHash).toMatch(/^[0-9a-f]{64}$/);
      expect(storedHash).not.toBe(token);
      expect(JSON.stringify(insert[1])).not.toContain(token);
    });

    it('retires earlier unused reset tokens, so only the newest link works', async () => {
      const { client, db } = database((sql) =>
        sql.includes('FROM users') ? { rows: [USER] } : undefined,
      );
      const { auth } = service(db);

      await auth.requestPasswordReset({ email: USER.email });

      const sql = statements(client.query);
      const retire = sql.findIndex(
        (s) =>
          s.includes('UPDATE email_tokens SET used_at = now()') &&
          s.includes('reset_password'),
      );
      const insert = sql.findIndex((s) =>
        s.includes('INSERT INTO email_tokens'),
      );
      expect(retire).toBeGreaterThan(-1);
      expect(retire).toBeLessThan(insert);
      expect(sql).toContain('COMMIT');
    });
  });

  describe('confirmPasswordReset', () => {
    it('refuses a token that is unknown, used or expired', async () => {
      const { client, db } = database(() => undefined);
      const { auth } = service(db);

      const error = await auth
        .confirmPasswordReset({ token: 'nope', password: 'a-new-password-1' })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(
        (error as UnprocessableEntityException).getResponse(),
      ).toMatchObject({
        error: 'INVALID_RESET_TOKEN',
      });
      expect(statements(client.query)).toContain('ROLLBACK');
    });

    it('sets the new password, spends the token and signs every device out', async () => {
      const { client, db } = database((sql) =>
        sql.includes('FROM email_tokens')
          ? { rows: [{ id: 'token-1', user_id: USER.id }] }
          : undefined,
      );
      const passwords = { hash: jest.fn(() => Promise.resolve('new-hash')) };
      const { auth } = service(db, passwords);

      await auth.confirmPasswordReset({
        token: 'raw-token',
        password: 'a-new-password-1',
      });

      expect(passwords.hash).toHaveBeenCalledWith('a-new-password-1');
      const lookup = client.query.mock.calls.find(([sql]) =>
        sql.includes('FROM email_tokens'),
      )!;
      expect(lookup[0]).toContain("purpose = 'reset_password'");
      expect(lookup[0]).toContain('expires_at > now()');
      expect(lookup[1]).toEqual([sha256('raw-token')]);
      const sql = statements(client.query);
      expect(
        sql.some((s) => s.includes('UPDATE users SET password_hash = $2')),
      ).toBe(true);
      expect(
        sql.some(
          (s) =>
            s.includes('UPDATE email_tokens SET used_at = now()') &&
            s.includes('WHERE user_id = $1'),
        ),
      ).toBe(true);
      expect(
        sql.some((s) => s.includes('UPDATE refresh_tokens SET revoked_at')),
      ).toBe(true);
      expect(sql).toContain('COMMIT');
    });

    it('retires every outstanding reset token for the account', async () => {
      const { client, db } = database((sql) =>
        sql.includes('FROM email_tokens')
          ? { rows: [{ id: 'token-1', user_id: USER.id }] }
          : undefined,
      );
      const passwords = { hash: jest.fn(() => Promise.resolve('new-hash')) };
      const { auth } = service(db, passwords);

      await auth.confirmPasswordReset({
        token: 'the-presented-token',
        password: 'a-new-password-1',
      });

      const retirement = client.query.mock.calls.find(
        ([sql]) =>
          sql.includes('UPDATE email_tokens SET used_at = now()') &&
          sql.includes('WHERE user_id = $1'),
      );
      expect(retirement).toBeDefined();
      expect(retirement![0]).toContain("purpose = 'reset_password'");
      expect(retirement![0]).toContain('used_at IS NULL');
      expect(retirement![0]).not.toContain('WHERE id');
      expect(retirement![1]).toEqual([USER.id]);
    });
  });
});
