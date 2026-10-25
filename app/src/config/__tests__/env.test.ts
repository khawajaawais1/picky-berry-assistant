import {
  PUBLIC_ENV_VARS,
  appEnvironment,
  firebaseApiKey,
  isLoopbackHost,
  loadConfig,
  parseApiBaseUrl,
  parseEnvironment,
} from '../env';

const {
  apiBaseUrl: API_URL_VAR,
  appEnvironment: APP_ENV_VAR,
  firebaseApiKey: FIREBASE_KEY_VAR,
} = PUBLIC_ENV_VARS;

describe('isLoopbackHost', () => {
  it.each(['localhost', 'LOCALHOST', '127.0.0.1', '127.9.9.9', '::1', '[::1]'])(
    'treats %s as loopback',
    (hostname) => {
      expect(isLoopbackHost(hostname)).toBe(true);
    },
  );

  it.each(['api.picky.app', '192.168.1.10', '0.0.0.0', 'localhost.evil.com'])(
    'treats %s as remote',
    (hostname) => {
      expect(isLoopbackHost(hostname)).toBe(false);
    },
  );

  it('does not treat a public hostname that merely resolves to 127.0.0.1 as loopback', () => {
    // DNS-rebinding style hostnames must not unlock clear-text HTTP.
    expect(isLoopbackHost('localtest.me')).toBe(false);
  });
});

describe('parseApiBaseUrl', () => {
  it('rejects a missing value', () => {
    expect(parseApiBaseUrl(undefined)).toEqual({ ok: false, reason: 'is not set' });
  });

  it('rejects a blank value', () => {
    expect(parseApiBaseUrl('   ')).toEqual({ ok: false, reason: 'is not set' });
  });

  it('accepts an absolute https URL and trims whitespace', () => {
    expect(parseApiBaseUrl('  https://api.picky.app  ')).toEqual({
      ok: true,
      url: 'https://api.picky.app',
    });
  });

  it('normalises scheme and host casing', () => {
    expect(parseApiBaseUrl('HTTPS://API.Picky.App')).toEqual({
      ok: true,
      url: 'https://api.picky.app',
    });
  });

  it('removes trailing slashes so callers can append paths safely', () => {
    expect(parseApiBaseUrl('https://api.picky.app/v1///')).toEqual({
      ok: true,
      url: 'https://api.picky.app/v1',
    });
  });

  it.each(['api.picky.app', '/v1', 'ftp://api.picky.app'])(
    'rejects the non-absolute URL %s',
    (value) => {
      const result = parseApiBaseUrl(value);
      expect(result.ok).toBe(false);
    },
  );

  it('rejects URLs with embedded credentials', () => {
    expect(parseApiBaseUrl('https://user:secret@api.picky.app')).toEqual({
      ok: false,
      reason: 'must not embed credentials',
    });
  });

  it('rejects clear-text http by default', () => {
    expect(parseApiBaseUrl('http://localhost:8000')).toEqual({
      ok: false,
      reason: 'must use https (clear-text http is only allowed for loopback hosts)',
    });
  });

  it('accepts clear-text http for a loopback host when explicitly allowed', () => {
    expect(parseApiBaseUrl('http://localhost:8000', { allowInsecureLoopback: true })).toEqual({
      ok: true,
      url: 'http://localhost:8000',
    });
  });

  it('still rejects clear-text http for a non-loopback host', () => {
    const result = parseApiBaseUrl('http://192.168.1.10:8000', { allowInsecureLoopback: true });
    expect(result.ok).toBe(false);
  });

  it('keeps an IPv6 loopback origin intact', () => {
    expect(parseApiBaseUrl('http://[::1]:8000', { allowInsecureLoopback: true })).toEqual({
      ok: true,
      url: 'http://[::1]:8000',
    });
  });
});

describe('parseEnvironment', () => {
  it('defaults to development when unset', () => {
    expect(parseEnvironment(undefined)).toEqual({ environment: 'development' });
  });

  it.each(['development', 'preview', 'production'] as const)('accepts %s', (value) => {
    expect(parseEnvironment(value)).toEqual({ environment: value });
  });

  it('reports an unsupported value instead of silently defaulting', () => {
    expect(parseEnvironment('staging')).toEqual({
      problem: {
        variable: APP_ENV_VAR,
        reason: 'must be one of development, preview, production',
      },
    });
  });
});

describe('appEnvironment', () => {
  it('answers the environment this build was made for', () => {
    expect(appEnvironment({ [APP_ENV_VAR]: 'preview' })).toBe('preview');
    expect(appEnvironment({ [APP_ENV_VAR]: 'production' })).toBe('production');
  });

  it('reads an unset value as a local run, which is what an unset value is', () => {
    expect(appEnvironment({})).toBe('development');
  });

  it('never reads a malformed value as anything but the strictest environment', () => {
    // `loadConfig` reports the misconfiguration; a caller asking this question must not
    // get a permissive answer out of a typo (see `verifyCode`).
    expect(appEnvironment({ [APP_ENV_VAR]: 'staging' })).toBe('production');
  });
});

describe('firebaseApiKey', () => {
  it('returns the configured public key, trimmed', () => {
    expect(firebaseApiKey({ [FIREBASE_KEY_VAR]: '  firebase-web-key  ' })).toBe('firebase-web-key');
  });

  it.each([undefined, '', '   '])('returns null when the key is %p', (value) => {
    expect(firebaseApiKey({ [FIREBASE_KEY_VAR]: value })).toBeNull();
  });
});

describe('loadConfig', () => {
  it('fails with every missing variable reported at once', () => {
    const result = loadConfig({});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected configuration to be invalid');
    expect(result.problems).toEqual([{ variable: API_URL_VAR, reason: 'is not set' }]);
  });

  it('returns a usable config for a valid https origin', () => {
    expect(loadConfig({ [API_URL_VAR]: 'https://api.picky.app' })).toEqual({
      ok: true,
      config: {
        environment: 'development',
        apiBaseUrl: 'https://api.picky.app',
        firebaseApiKey: null,
      },
    });
  });

  it('reports an invalid environment and an invalid URL together', () => {
    const result = loadConfig({ [APP_ENV_VAR]: 'staging', [API_URL_VAR]: 'nope' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected configuration to be invalid');
    expect(result.problems.map((problem) => problem.variable)).toEqual([APP_ENV_VAR, API_URL_VAR]);
  });

  it('allows clear-text loopback http in development', () => {
    const result = loadConfig({
      [APP_ENV_VAR]: 'development',
      [API_URL_VAR]: 'http://127.0.0.1:8000',
    });
    expect(result).toEqual({
      ok: true,
      config: {
        environment: 'development',
        apiBaseUrl: 'http://127.0.0.1:8000',
        firebaseApiKey: null,
      },
    });
  });

  it('refuses clear-text loopback http outside development', () => {
    const result = loadConfig({
      [APP_ENV_VAR]: 'production',
      [API_URL_VAR]: 'http://localhost:8000',
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected configuration to be invalid');
    expect(result.problems).toEqual([
      {
        variable: API_URL_VAR,
        reason: 'must use https (clear-text http is only allowed for loopback hosts)',
      },
    ]);
  });

  it('never leaks an api token into the resolved config', () => {
    const result = loadConfig({
      [API_URL_VAR]: 'https://api.picky.app',
      EXPO_PUBLIC_API_TOKEN: 'super-secret',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected configuration to be valid');
    expect(Object.keys(result.config)).toEqual(['environment', 'apiBaseUrl', 'firebaseApiKey']);
    expect(JSON.stringify(result.config)).not.toContain('super-secret');
  });
});
