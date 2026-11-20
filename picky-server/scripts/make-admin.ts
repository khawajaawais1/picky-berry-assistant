import 'dotenv/config';
import { Pool } from 'pg';

async function makeAdmin(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error('Usage: npm run make-admin -- <email>');
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl:
      process.env.DB_SSL === 'disable' ? false : { rejectUnauthorized: false },
    options: '-c search_path=public,extensions',
  });
  try {
    const result = await pool.query(
      `UPDATE users SET role = 'admin'
       WHERE lower(email) = $1 AND deleted_at IS NULL`,
      [email],
    );
    if (result.rowCount !== 1) {
      throw new Error('No active account matched the provided email.');
    }
    console.log('Admin role updated.');
  } finally {
    await pool.end();
  }
}

void makeAdmin().catch((error: unknown) => {
  console.error('Could not promote account:', error);
  process.exitCode = 1;
});
