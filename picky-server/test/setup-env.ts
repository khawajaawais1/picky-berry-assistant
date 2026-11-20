process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/picky';
process.env.DB_SSL = 'disable';
process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';
process.env.DEV_AUTH_BYPASS = 'false';
process.env.THROTTLE_DISABLED = 'true';
