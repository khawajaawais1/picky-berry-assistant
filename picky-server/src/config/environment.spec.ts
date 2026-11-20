import { validateEnvironment } from './environment';

const baseEnvironment = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/picky',
  JWT_SECRET: 'test-secret-with-at-least-thirty-two-characters',
};

describe('validateEnvironment', () => {
  it('rejects auth bypass in production', () => {
    expect(() =>
      validateEnvironment({
        ...baseEnvironment,
        NODE_ENV: 'production',
        DEV_AUTH_BYPASS: 'true',
      }),
    ).toThrow('DEV_AUTH_BYPASS must be disabled in production.');
  });

  it('normalizes local defaults', () => {
    const config = validateEnvironment(baseEnvironment);
    expect(config.NODE_ENV).toBe('development');
    expect(config.DEV_AUTH_BYPASS).toBe(false);
  });
});
