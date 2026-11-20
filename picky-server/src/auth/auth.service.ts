import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PoolClient, QueryResultRow } from 'pg';
import { createHash, randomBytes } from 'node:crypto';
import { UserRole } from '../common/decorators/roles.decorator';
import { DbService } from '../db/db.service';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { MailService } from './mail.service';
import { PasswordService } from './password.service';

interface AccountRow extends QueryResultRow {
  id: string;
  email: string;
  password_hash: string;
  nickname: string | null;
  role: UserRole;
}

interface RefreshRow extends AccountRow {
  token_id: string;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by: string | null;
}

interface SessionUser {
  id: string;
  email: string;
  nickname: string | null;
  role: UserRole;
}

interface IssuedSession {
  session: {
    access_token: string;
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number;
    user: SessionUser;
  };
  refreshTokenId: string;
}

const invalidCredentials = () =>
  new UnauthorizedException({
    error: 'INVALID_CREDENTIALS',
    message: 'Email or password is incorrect.',
  });

const invalidRefreshToken = () =>
  new UnauthorizedException({
    error: 'INVALID_REFRESH_TOKEN',
    message: 'Refresh token is invalid or expired.',
  });

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlDays: number;

  constructor(
    private readonly database: DbService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {
    this.accessTokenTtlSeconds = this.config.get<number>(
      'ACCESS_TOKEN_TTL_S',
      900,
    );
    this.refreshTokenTtlDays = this.config.get<number>(
      'REFRESH_TOKEN_TTL_DAYS',
      30,
    );
  }

  async register(
    input: RegisterDto,
    userAgent: string | undefined,
  ): Promise<IssuedSession['session']> {
    const termsVersion = input.consents?.terms_version?.trim();
    const privacyPolicyVersion = input.consents?.privacy_policy_version?.trim();
    if (!termsVersion || !privacyPolicyVersion) {
      throw new UnprocessableEntityException({
        error: 'CONSENT_REQUIRED',
        message: 'Terms and privacy policy consent are required.',
      });
    }

    const email = input.email.trim().toLowerCase();
    const passwordHash = await this.passwords.hash(input.password);
    const client = await this.database.pool.connect();
    let account: AccountRow;
    let verificationToken: string;
    let issued: IssuedSession;
    try {
      await client.query('BEGIN');
      const inserted = await client.query<AccountRow>(
        `INSERT INTO users (email, password_hash, nickname, lang)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (lower(email)) WHERE deleted_at IS NULL DO NOTHING
         RETURNING id, email, password_hash, nickname, role`,
        [email, passwordHash, input.nickname ?? null, input.lang ?? 'fi'],
      );
      account = inserted.rows[0];
      if (!account) {
        throw new ConflictException({
          error: 'EMAIL_TAKEN',
          message: 'An account already exists for this email.',
        });
      }

      await client.query(
        `INSERT INTO consents (user_id, kind, version, granted)
         VALUES ($1, 'terms', $2, true),
                ($1, 'privacy_policy', $3, true),
                ($1, 'background_location', NULL, $4)`,
        [
          account.id,
          termsVersion,
          privacyPolicyVersion,
          input.consents?.background_location ?? false,
        ],
      );

      verificationToken = randomBytes(32).toString('base64url');
      await client.query(
        `INSERT INTO email_tokens (user_id, purpose, token_hash, expires_at)
         VALUES ($1, 'verify_email', $2, now() + interval '24 hours')`,
        [account.id, tokenHash(verificationToken)],
      );
      issued = await this.issueSession(account, userAgent, client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const baseUrl = this.config.get<string>(
      'APP_PUBLIC_URL',
      'http://localhost:3000',
    );
    const verificationUrl = new URL('/verify-email', baseUrl);
    verificationUrl.searchParams.set('token', verificationToken);
    this.mail.sendVerification(
      account.id,
      account.email,
      verificationUrl.toString(),
    );
    return issued.session;
  }

  async login(
    input: LoginDto,
    userAgent: string | undefined,
  ): Promise<IssuedSession['session']> {
    const email = input.email.trim().toLowerCase();
    const result = await this.database.pool.query<AccountRow>(
      `SELECT id, email, password_hash, nickname, role
       FROM users WHERE lower(email) = $1 AND deleted_at IS NULL`,
      [email],
    );
    const account = result.rows[0];
    if (!account) {
      await this.passwords.verifyDummy(input.password);
      throw invalidCredentials();
    }
    if (!(await this.passwords.verify(account.password_hash, input.password))) {
      throw invalidCredentials();
    }
    return (await this.issueSession(account, userAgent)).session;
  }

  async refresh(input: RefreshDto, userAgent: string | undefined) {
    const client = await this.database.pool.connect();
    let session: IssuedSession['session'] | undefined;
    let invalid = false;
    try {
      await client.query('BEGIN');
      const result = await client.query<RefreshRow>(
        `SELECT rt.id AS token_id, rt.expires_at, rt.revoked_at, rt.replaced_by,
                u.id, u.email, u.password_hash, u.nickname, u.role
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE rt.token_hash = $1 AND u.deleted_at IS NULL
         FOR UPDATE OF rt`,
        [tokenHash(input.refresh_token)],
      );
      const row = result.rows[0];
      if (!row) {
        invalid = true;
      } else if (row.revoked_at && row.replaced_by) {
        await client.query(
          `UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, now())
           WHERE user_id = $1`,
          [row.id],
        );
        invalid = true;
      } else if (
        row.revoked_at ||
        new Date(row.expires_at).getTime() <= Date.now()
      ) {
        if (!row.revoked_at) {
          await client.query(
            'UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1',
            [row.token_id],
          );
        }
        invalid = true;
      } else {
        const issued = await this.issueSession(row, userAgent, client);
        await client.query(
          `UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $2
           WHERE id = $1`,
          [row.token_id, issued.refreshTokenId],
        );
        session = issued.session;
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    if (invalid || !session) throw invalidRefreshToken();
    return session;
  }

  async logout(userId: string, input: RefreshDto): Promise<void> {
    await this.database.pool.query(
      `UPDATE refresh_tokens SET revoked_at = now()
       WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL`,
      [userId, tokenHash(input.refresh_token)],
    );
  }

  async verifyEmail(input: VerifyEmailDto): Promise<void> {
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const token = await client.query<{ id: string; user_id: string }>(
        `SELECT et.id, et.user_id
         FROM email_tokens et
         JOIN users u ON u.id = et.user_id
         WHERE et.token_hash = $1 AND et.purpose = 'verify_email'
           AND et.used_at IS NULL AND et.expires_at > now()
           AND u.deleted_at IS NULL
         FOR UPDATE OF et`,
        [tokenHash(input.token)],
      );
      if (!token.rows[0]) {
        throw new UnprocessableEntityException({
          error: 'INVALID_VERIFICATION_TOKEN',
          message: 'Verification token is invalid or expired.',
        });
      }
      await client.query(
        'UPDATE email_tokens SET used_at = now() WHERE id = $1',
        [token.rows[0].id],
      );
      await client.query(
        'UPDATE users SET email_verified_at = now() WHERE id = $1',
        [token.rows[0].user_id],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAccount(userId: string, input: DeleteAccountDto): Promise<void> {
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const user = await client.query<AccountRow>(
        `SELECT id, email, password_hash, nickname, role
         FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [userId],
      );
      if (
        !user.rows[0] ||
        !(await this.passwords.verify(
          user.rows[0].password_hash,
          input.password,
        ))
      ) {
        throw invalidCredentials();
      }

      await client.query(
        `UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, now())
         WHERE user_id = $1`,
        [userId],
      );
      await client.query('DELETE FROM devices WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM consents WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM email_tokens WHERE user_id = $1', [
        userId,
      ]);
      await client.query(
        'UPDATE visits SET user_id = NULL WHERE user_id = $1',
        [userId],
      );
      await client.query(
        'UPDATE reports SET user_id = NULL WHERE user_id = $1',
        [userId],
      );
      await client.query(
        `UPDATE users
         SET deleted_at = now(), email = $2, nickname = NULL,
             password_hash = '', species_interest = '{}'
         WHERE id = $1`,
        [userId, `deleted+${userId}@invalid.local`],
      );
      await client.query(
        `INSERT INTO jobs (type, payload, dedupe_key)
         VALUES ('purge_personal_data', $1::jsonb, $2)
         ON CONFLICT (dedupe_key) WHERE status = 'queued' DO NOTHING`,
        [JSON.stringify({ user_id: userId }), `purge:${userId}`],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async issueSession(
    account: SessionUser,
    userAgent: string | undefined,
    client?: PoolClient,
  ): Promise<IssuedSession> {
    const accessToken = await this.jwt.signAsync(
      { sub: account.id, role: account.role },
      { algorithm: 'HS256', expiresIn: this.accessTokenTtlSeconds },
    );
    const refreshToken = randomBytes(32).toString('base64url');
    const queryable = client ?? this.database.pool;
    const inserted = await queryable.query<{ id: string }>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
       VALUES ($1, $2, now() + ($3 * interval '1 day'), $4)
       RETURNING id`,
      [
        account.id,
        tokenHash(refreshToken),
        this.refreshTokenTtlDays,
        userAgent?.slice(0, 512) ?? null,
      ],
    );
    return {
      refreshTokenId: inserted.rows[0].id,
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: this.accessTokenTtlSeconds,
        user: {
          id: account.id,
          email: account.email,
          nickname: account.nickname,
          role: account.role,
        },
      },
    };
  }
}
