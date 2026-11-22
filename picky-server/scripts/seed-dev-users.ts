import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { hash } from 'argon2';
import { Pool } from 'pg';
import { validateEnvironment } from '../src/config/environment';

/** The id DEV_AUTH_BYPASS acts as (src/auth/jwt-auth.guard.ts). */
const DEV_BYPASS_ID = '00000000-0000-0000-0000-000000000001';
const PLACEHOLDER_PASSWORD = 'replace-with-a-local-password-at-least-10-chars';

function requireLocalPassword(value: unknown, name: string): string {
  if (
    typeof value !== 'string' ||
    value.length < 10 ||
    value.length > 128 ||
    value === PLACEHOLDER_PASSWORD
  ) {
    throw new Error(
      `Set ${name} in .env to a local password between 10 and 128 characters.`,
    );
  }
  return value;
}

async function seedDevUsers(): Promise<void> {
  const config = validateEnvironment(process.env);
  if (config.NODE_ENV === 'production') {
    throw new Error('Refusing to seed development users in production.');
  }
  const pickerPassword = requireLocalPassword(
    config.DEV_PICKER_PASSWORD,
    'DEV_PICKER_PASSWORD',
  );
  const adminPassword = requireLocalPassword(
    config.DEV_ADMIN_PASSWORD,
    'DEV_ADMIN_PASSWORD',
  );
  const adminEmail = String(config.DEV_ADMIN_EMAIL);
  const pool = new Pool({
    connectionString: String(config.DATABASE_URL),
    max: 2,
    ssl: config.DB_SSL === 'disable' ? false : { rejectUnauthorized: false },
    options: '-c search_path=public,extensions',
  });
  try {
    // The bypass identity needs a row so audit_log.actor_id resolves. Its id is not a
    // version-4 UUID, so the JWT guard never accepts it as a token subject: nobody signs
    // in as this account, and its password is random.
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, email_verified_at)
       VALUES ($1, 'dev-admin@example.com', $2, 'admin', now())
       ON CONFLICT (id) DO UPDATE SET role = 'admin'`,
      [DEV_BYPASS_ID, await hash(randomUUID())],
    );
    // The default operator account that signs in to the admin console.
    await pool.query(
      `INSERT INTO users (email, password_hash, role, email_verified_at)
       VALUES ($1, $2, 'admin', now())
       ON CONFLICT (lower(email)) WHERE deleted_at IS NULL
       DO UPDATE SET password_hash = EXCLUDED.password_hash,
                     role = 'admin',
                     email_verified_at = COALESCE(users.email_verified_at, now())`,
      [adminEmail, await hash(adminPassword)],
    );
    await pool.query(
      `INSERT INTO users (email, password_hash, role, email_verified_at)
       VALUES ('picker@example.com', $1, 'picker', now())
       ON CONFLICT (lower(email)) WHERE deleted_at IS NULL
       DO UPDATE SET password_hash = EXCLUDED.password_hash,
                     role = 'picker',
                     email_verified_at = COALESCE(users.email_verified_at, now())`,
      [await hash(pickerPassword)],
    );
    console.log(
      `Development accounts are ready. Admin login: ${adminEmail} (DEV_ADMIN_PASSWORD); picker login: picker@example.com (DEV_PICKER_PASSWORD).`,
    );
  } finally {
    await pool.end();
  }
}

void seedDevUsers().catch((error: unknown) => {
  console.error('Development user seeding failed:', error);
  process.exitCode = 1;
});
