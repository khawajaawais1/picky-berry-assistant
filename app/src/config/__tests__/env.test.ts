import {
  PUBLIC_ENV_VARS,
  appEnvironment,
  isLoopbackHost,
  isPrivateNetworkHost,
  loadConfig,
  parseApiBaseUrl,
  parseEnvironment,
  reasoningApiBaseUrl,
  resolveDevelopmentApiBaseUrl,
  zoneSourceKind,
} from '../env';

const {
  apiBaseUrl: API_URL_VAR,
  appEnvironment: APP_ENV_VAR,
  zoneSource: ZONE_SOURCE_VAR,
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

describe('zoneSourceKind', () => {
  // The map reads the team API (ADR-065). The layout harness opens every screen without a
  // session, so it asks for the bundled stub by name, and a shipped build cannot.
  it('reads the API when nothing is set', () => {
    expect(zoneSourceKind({})).toBe('api');
  });

  it.each(['development', 'preview'])('reads the stub in a %s build that asks for it', (env) => {
    expect(zoneSourceKind({ [APP_ENV_VAR]: env, [ZONE_SOURCE_VAR]: ' stub ' })).toBe('stub');
  });

  it('never reads the stub in a production build', () => {
    expect(zoneSourceKind({ [APP_ENV_VAR]: 'production', [ZONE_SOURCE_VAR]: 'stub' })).toBe('api');
  });

  it('reads anything it does not recognise as the API', () => {
    expect(zoneSourceKind({ [ZONE_SOURCE_VAR]: 'demo' })).toBe('api');
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
    expect(Object.keys(result.config)).toEqual(['environment', 'apiBaseUrl']);
    expect(JSON.stringify(result.config)).not.toContain('super-secret');
  });
});

describe('local-network development hosts', () => {
  it.each(['192.168.1.20', '10.0.2.2', '172.16.4.1', 'macbook.local'])(
    'treats %s as a local-network host',
    (host) => {
      expect(isPrivateNetworkHost(host)).toBe(true);
    },
  );

  it.each(['8.8.8.8', '172.32.0.1', 'api.example.com'])('does not treat %s as local', (host) => {
    expect(isPrivateNetworkHost(host)).toBe(false);
  });

  it('accepts clear-text http to a LAN host in development only', () => {
    const lan = { EXPO_PUBLIC_API_BASE_URL: 'http://192.168.1.20:3000' };

    expect(loadConfig({ ...lan, EXPO_PUBLIC_APP_ENV: 'development' }).ok).toBe(true);
    expect(loadConfig({ ...lan, EXPO_PUBLIC_APP_ENV: 'preview' }).ok).toBe(false);
  });
});

describe('resolveDevelopmentApiBaseUrl', () => {
  const local = { environment: 'development' as const, apiBaseUrl: 'http://localhost:3000' };

  it('points a loopback URL at the Metro host on a device', () => {
    expect(
      resolveDevelopmentApiBaseUrl(local, {
        platform: 'ios',
        devServerHostUri: '192.168.1.20:8081',
      }).apiBaseUrl,
    ).toBe('http://192.168.1.20:3000');
  });

  it('falls back to the Android emulator host alias', () => {
    expect(resolveDevelopmentApiBaseUrl(local, { platform: 'android' }).apiBaseUrl).toBe(
      'http://10.0.2.2:3000',
    );
  });

  it('leaves the web build, other environments and remote URLs alone', () => {
    expect(resolveDevelopmentApiBaseUrl(local, { platform: 'web' })).toBe(local);
    const preview = { ...local, environment: 'preview' as const };
    expect(resolveDevelopmentApiBaseUrl(preview, { platform: 'android' })).toBe(preview);
    const remote = { ...local, apiBaseUrl: 'https://api.example.com' };
    expect(resolveDevelopmentApiBaseUrl(remote, { platform: 'android' })).toBe(remote);
  });
});

describe('reasoningApiBaseUrl', () => {
  const VAR = PUBLIC_ENV_VARS.reasoningApiBaseUrl;

  it('reads the deployed reasoning backend when none is configured', () => {
    expect(reasoningApiBaseUrl({})).toBe('https://picky-backend-cd0u.onrender.com');
    expect(reasoningApiBaseUrl({ [VAR]: '  ' })).toBe('https://picky-backend-cd0u.onrender.com');
  });

  it('takes a configured origin, normalised', () => {
    expect(reasoningApiBaseUrl({ [VAR]: 'https://reasoning.example.com/' })).toBe(
      'https://reasoning.example.com',
    );
  });

  it('allows a clear-text local backend in development only', () => {
    const local = { [VAR]: 'http://localhost:8000' };
    expect(reasoningApiBaseUrl({ ...local, [APP_ENV_VAR]: 'development' })).toBe(
      'http://localhost:8000',
    );
    expect(reasoningApiBaseUrl({ ...local, [APP_ENV_VAR]: 'production' })).toBeNull();
  });

  it('refuses an address it cannot check', () => {
    expect(reasoningApiBaseUrl({ [VAR]: 'https://user:pw@example.com' })).toBeNull();
    expect(reasoningApiBaseUrl({ [VAR]: 'ftp://example.com' })).toBeNull();
  });
});
