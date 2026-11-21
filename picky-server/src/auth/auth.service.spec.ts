import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DbService } from '../db/db.service';
import { PasswordService } from './password.service';

describe('AuthService', () => {
  const jwt = { signAsync: jest.fn() };
  const config = { get: jest.fn() };
  const mail = { sendVerification: jest.fn(), sendPasswordReset: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback?: unknown) =>
      key === 'APP_PUBLIC_URL' ? 'https://app.example' : fallback,
    );
  });

  function createService(database: unknown, passwords: unknown): AuthService {
    return new AuthService(
      database as DbService,
      passwords as PasswordService,
      jwt as never,
      config as never,
      mail as never,
    );
  }

  it('uses the same login error for unknown email and wrong password', async () => {
    const database = {
      pool: {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [
              {
                id: '00000000-0000-4000-8000-000000000001',
                email: 'picker@example.com',
                password_hash: 'encoded',
                nickname: null,
                role: 'picker',
              },
            ],
          }),
      },
    };
    const passwords = {
      verifyDummy: jest.fn().mockResolvedValue(undefined),
      verify: jest.fn().mockResolvedValue(false),
    };
    const service = createService(database, passwords);

    const getLoginError = (promise: Promise<unknown>) =>
      promise.then(
        () => {
          throw new Error('Expected authentication to fail.');
        },
        (error: unknown) => {
          if (error instanceof UnauthorizedException) return error;
          throw error;
        },
      );
    const unknownEmail = getLoginError(
      service.login(
        { email: 'missing@example.com', password: 'valid-length-password' },
        undefined,
      ),
    );
    const wrongPassword = getLoginError(
      service.login(
        { email: 'picker@example.com', password: 'valid-length-password' },
        undefined,
      ),
    );
    const [unknownError, passwordError] = await Promise.all([
      unknownEmail,
      wrongPassword,
    ]);

    expect(unknownError.getStatus()).toBe(passwordError.getStatus());
    expect(unknownError.getResponse()).toEqual(passwordError.getResponse());
    expect(passwords.verifyDummy).toHaveBeenCalledTimes(1);
    expect(passwords.verify).toHaveBeenCalledTimes(1);
  });

  it('revokes all active refresh tokens when a rotated token is reused', async () => {
    const query = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM refresh_tokens rt')) {
        return Promise.resolve({
          rows: [
            {
              token_id: 'refresh-row',
              id: '00000000-0000-4000-8000-000000000001',
              email: 'picker@example.com',
              password_hash: 'encoded',
              nickname: null,
              role: 'picker',
              expires_at: new Date(Date.now() + 60_000),
              revoked_at: new Date(),
              replaced_by: 'new-refresh-row',
            },
          ],
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const client = { query, release: jest.fn() };
    const database = {
      pool: { connect: jest.fn().mockResolvedValue(client) },
    };
    const service = createService(database, {});

    await expect(
      service.refresh({ refresh_token: 'old-token' }, undefined),
    ).rejects.toMatchObject({ status: 401 });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['00000000-0000-4000-8000-000000000001'],
    );
    expect(query).toHaveBeenCalledWith('COMMIT');
  });

  it('accepts a reset for an unknown address without writing or mailing anything', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const client = { query, release: jest.fn() };
    const database = {
      pool: { connect: jest.fn().mockResolvedValue(client) },
    };
    const service = createService(database, {});

    await expect(
      service.requestPasswordReset({ email: 'missing@example.com' }),
    ).resolves.toBeUndefined();

    // The request runs in one transaction: look the address up, commit, write nothing.
    expect(query).toHaveBeenCalledWith('BEGIN');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE lower(email) = $1'),
      ['missing@example.com'],
    );
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO email_tokens'),
      expect.anything(),
    );
    expect(mail.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('stores a one-hour reset token and mails a link for a known address', async () => {
    const account = {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'picker@example.com',
      password_hash: 'encoded',
      nickname: null,
      role: 'picker',
    };
    const query = jest
      .fn()
      .mockImplementation((sql: string) =>
        sql.includes('FROM users')
          ? Promise.resolve({ rows: [account] })
          : Promise.resolve({ rows: [] }),
      );
    const client = { query, release: jest.fn() };
    const database = {
      pool: { connect: jest.fn().mockResolvedValue(client) },
    };
    const service = createService(database, {});

    await service.requestPasswordReset({ email: ' Picker@Example.com ' });

    expect(query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE lower(email) = $1'),
      ['picker@example.com'],
    );
    // Earlier unused reset links are retired, under the purpose the schema allows.
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("purpose = 'reset_password'"),
      [account.id],
    );
    // One hour, the schema's purpose value, and a SHA-256 hash rather than the token.
    expect(query).toHaveBeenNthCalledWith(
      4,
      expect.stringMatching(
        /VALUES \(\$1, 'reset_password', \$2, now\(\) \+ interval '1 hour'\)/s,
      ),
      [account.id, expect.stringMatching(/^[a-f0-9]{64}$/)],
    );
    expect(query).toHaveBeenNthCalledWith(5, 'COMMIT');
    expect(mail.sendPasswordReset).toHaveBeenCalledWith(
      account.id,
      account.email,
      expect.stringMatching(
        /^https:\/\/app\.example\/reset-password\?token=[A-Za-z0-9_-]{43}$/,
      ),
    );
  });

  it('consumes the reset token, updates the password and revokes every session', async () => {
    const userId = '00000000-0000-4000-8000-000000000001';
    const query = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM email_tokens et')) {
        return Promise.resolve({
          rows: [{ id: 'reset-token', user_id: userId }],
        });
      }
      return Promise.resolve({ rows: [], rowCount: 1 });
    });
    const client = { query, release: jest.fn() };
    const passwords = {
      hash: jest.fn().mockResolvedValue('new-password-hash'),
    };
    const service = createService(
      { pool: { connect: jest.fn().mockResolvedValue(client) } },
      passwords,
    );

    await service.confirmPasswordReset({
      token: ' the-reset-token ',
      password: 'berries1234',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("et.purpose = 'reset_password'"),
      [expect.stringMatching(/^[a-f0-9]{64}$/)],
    );
    expect(passwords.hash).toHaveBeenCalledWith('berries1234');
    // Every outstanding reset token for the account is spent, so a second link minted by a
    // concurrent request cannot be used after this password change.
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("purpose = 'reset_password'"),
      [userId],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET password_hash = $2'),
      [userId, 'new-password-hash'],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE refresh_tokens'),
      [userId],
    );
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('refuses an expired or already-used reset token without changing the account', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const client = { query, release: jest.fn() };
    const passwords = { hash: jest.fn() };
    const service = createService(
      { pool: { connect: jest.fn().mockResolvedValue(client) } },
      passwords,
    );

    await expect(
      service.confirmPasswordReset({
        token: 'spent-token',
        password: 'berries1234',
      }),
    ).rejects.toMatchObject({
      status: 422,
      response: { error: 'INVALID_RESET_TOKEN' },
    });

    expect(passwords.hash).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET password_hash'),
      expect.anything(),
    );
  });
});
