import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { hash } from 'argon2';
import { Pool } from 'pg';
import { validateEnvironment } from '../src/config/environment';

const DEV_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

async function seedDevUsers(): Promise<void> {
  const config = validateEnvironment(process.env);
  if (config.NODE_ENV === 'production') {
    throw new Error('Refusing to seed development users in production.');
  }
  const pickerPassword = config.DEV_PICKER_PASSWORD;
  if (
    typeof pickerPassword !== 'string' ||
    pickerPassword.length < 10 ||
    pickerPassword.length > 128 ||
    pickerPassword === 'replace-with-a-local-password-at-least-10-chars'
  ) {
    throw new Error(
      'Set DEV_PICKER_PASSWORD in .env to a local password between 10 and 128 characters.',
    );
  }
  const pool = new Pool({
    connectionString: String(config.DATABASE_URL),
    max: 2,
    ssl: config.DB_SSL === 'disable' ? false : { rejectUnauthorized: false },
    options: '-c search_path=public,extensions',
  });
  try {
    const adminHash = await hash(randomUUID());
    const pickerHash = await hash(pickerPassword);
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, email_verified_at)
       VALUES ($1, 'dev-admin@example.com', $2, 'admin', now())
       ON CONFLICT (id) DO UPDATE SET role = 'admin'`,
      [DEV_ADMIN_ID, adminHash],
    );
    await pool.query(
      `INSERT INTO users (email, password_hash, role, email_verified_at)
       VALUES ('picker@example.com', $1, 'picker', now())
       ON CONFLICT (lower(email)) WHERE deleted_at IS NULL
       DO UPDATE SET password_hash = EXCLUDED.password_hash,
                     role = 'picker',
                     email_verified_at = COALESCE(users.email_verified_at, now())`,
      [pickerHash],
    );
    console.log(
      'Development admin and picker accounts are ready. Picker login: picker@example.com (password is configured in DEV_PICKER_PASSWORD).',
    );
  } finally {
    await pool.end();
  }
}

void seedDevUsers().catch((error: unknown) => {
  console.error('Development user seeding failed:', error);
  process.exitCode = 1;
});
