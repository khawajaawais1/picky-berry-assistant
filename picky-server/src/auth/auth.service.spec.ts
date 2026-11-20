import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DbService } from '../db/db.service';
import { PasswordService } from './password.service';

describe('AuthService', () => {
  const jwt = { signAsync: jest.fn() };
  const config = { get: jest.fn() };
  const mail = { sendVerification: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
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
});
