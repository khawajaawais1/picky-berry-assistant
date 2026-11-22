/**
 * Public runtime configuration.
 *
 * Expo inlines variables prefixed with `EXPO_PUBLIC_` into the client bundle.
 * Everything resolved here is therefore **public**: anyone can read it from the
 * shipped app. Never add secrets, server credentials, privileged API keys or
 * signing material to this module. Anything that must stay private is enforced
 * (and kept) server-side — see SECURITY.md.
 *
 * The module is deliberately dependency-free and side-effect-free so it can be
 * unit tested and so a bad configuration produces a readable error instead of a
 * crash on launch.
 */

export const PUBLIC_ENV_VARS = {
  apiBaseUrl: 'EXPO_PUBLIC_API_BASE_URL',
  appEnvironment: 'EXPO_PUBLIC_APP_ENV',
  zoneSource: 'EXPO_PUBLIC_ZONE_SOURCE',
} as const;

export type PublicEnvSource = Partial<Record<string, string | undefined>>;

export type AppEnvironment = 'development' | 'preview' | 'production';

const APP_ENVIRONMENTS: readonly AppEnvironment[] = ['development', 'preview', 'production'];

export type AppConfig = {
  environment: AppEnvironment;
  /** Normalised absolute base URL of the Picky API. */
  apiBaseUrl: string;
};

export type ConfigProblem = {
  /** Name of the offending environment variable. */
  variable: string;
  /** Human-readable, secret-free explanation. */
  reason: string;
};

export type ConfigResult =
  { ok: true; config: AppConfig } | { ok: false; problems: ConfigProblem[] };

export type UrlParseResult = { ok: true; url: string } | { ok: false; reason: string };

function parseAbsoluteUrl(
  raw: string,
): { protocol: string; host: string; hostname: string; path: string } | null {
  // Hand-rolled instead of `new URL`: React Native ships a partial URL
  // implementation whose behaviour differs from Node/browsers, and a config
  // guard must behave identically on device and in tests.
  const match = /^(https?):\/\/([^/?#\s]+)(\/[^?#\s]*)?$/i.exec(raw.trim());
  if (!match) return null;

  const protocol = match[1]!.toLowerCase();
  const host = match[2]!.toLowerCase();
  const path = match[3] ?? '';

  let hostname: string;
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    if (end === -1) return null;
    hostname = host.slice(0, end + 1);
  } else {
    hostname = host.split(':')[0]!;
  }
  if (hostname.length === 0) return null;

  return { protocol, host, hostname, path };
}

/** Loopback hosts are the only place clear-text HTTP is tolerated (local dev). */
export function isLoopbackHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return host === 'localhost' || host === '::1' || host.startsWith('127.');
}

/**
 * A host on the developer's own network: an RFC 1918 address, the Android emulator's alias for
 * the host machine (`10.0.2.2` is inside 10/8) or an mDNS `.local` name. A phone running a
 * development build reaches the API on the developer's machine through one of these, never
 * through `localhost`, which on the phone is the phone itself.
 */
export function isPrivateNetworkHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host.endsWith('.local')) return true;

  const octets = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!octets) return false;

  const [a, b] = [Number(octets[1]), Number(octets[2])];
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/**
 * Validates and normalises the API base URL.
 *
 * Rejects:
 * - missing/empty values,
 * - anything that is not an absolute http(s) URL,
 * - URLs with embedded credentials (they would leak into logs and headers),
 * - clear-text http unless it targets a loopback host *and* the caller opted in.
 */
export function parseApiBaseUrl(
  raw: string | undefined,
  options: { allowInsecureLoopback?: boolean; allowInsecureLocalNetwork?: boolean } = {},
): UrlParseResult {
  const value = raw?.trim();
  if (!value) {
    return { ok: false, reason: 'is not set' };
  }

  const parsed = parseAbsoluteUrl(value);
  if (!parsed) {
    return { ok: false, reason: 'must be an absolute http(s) URL, e.g. https://api.example.com' };
  }
  if (parsed.host.includes('@')) {
    return { ok: false, reason: 'must not embed credentials' };
  }
  if (
    parsed.protocol === 'http' &&
    !(options.allowInsecureLoopback && isLoopbackHost(parsed.hostname)) &&
    !(options.allowInsecureLocalNetwork && isPrivateNetworkHost(parsed.hostname))
  ) {
    return {
      ok: false,
      reason: options.allowInsecureLocalNetwork
        ? 'must use https (clear-text http is only allowed for loopback and local-network hosts)'
        : 'must use https (clear-text http is only allowed for loopback hosts)',
    };
  }

  const normalisedPath = parsed.path.replace(/\/+$/, '');
  return { ok: true, url: `${parsed.protocol}://${parsed.host}${normalisedPath}` };
}

export function parseEnvironment(
  raw: string | undefined,
): { environment: AppEnvironment } | { problem: ConfigProblem } {
  const value = raw?.trim();
  if (!value) return { environment: 'development' };

  if (!(APP_ENVIRONMENTS as readonly string[]).includes(value)) {
    return {
      problem: {
        variable: PUBLIC_ENV_VARS.appEnvironment,
        reason: `must be one of ${APP_ENVIRONMENTS.join(', ')}`,
      },
    };
  }
  return { environment: value as AppEnvironment };
}

/**
 * The public variables as the bundle actually carries them.
 *
 * Every value is read as a **literal** `process.env.EXPO_PUBLIC_<NAME>` member expression,
 * because that is the only shape the build substitutes: Expo's Babel pipeline replaces that
 * one form with the value at build time (and, outside production, with a read of the same
 * name off its virtual env module). Any other way of reaching the same key —
 * `process.env[PUBLIC_ENV_VARS.appEnvironment]`, which is what this module used to do — is
 * left alone in the bundle, where the runtime's `process.env` carries none of these names. A
 * computed lookup therefore reads as *unset* in every build, which is how a production export
 * came to accept the stand-in credential and to mount the sign-in prototype
 * (`e2e/production-export.spec.ts` is the check that keeps it fixed; the unit tests here
 * cannot see it, because Node's `process.env` is a real object).
 */
function declaredPublicEnv(): PublicEnvSource {
  return {
    [PUBLIC_ENV_VARS.apiBaseUrl]: process.env.EXPO_PUBLIC_API_BASE_URL,
    [PUBLIC_ENV_VARS.appEnvironment]: process.env.EXPO_PUBLIC_APP_ENV,
    [PUBLIC_ENV_VARS.zoneSource]: process.env.EXPO_PUBLIC_ZONE_SOURCE,
  };
}

/**
 * The environment this build was made for.
 *
 * `EXPO_PUBLIC_APP_ENV` is read in this module and nowhere else (AGENTS.md §5), and this is
 * the accessor for code that needs that one answer rather than a whole validated config. An
 * unset value is `development`, which is what a local run is — and a value the build could not
 * substitute reads as unset, which is why the read in `declaredPublicEnv` has to stay literal.
 *
 * A value that is not one of the three is **not** read as a permissive environment: it is a
 * misconfiguration that `loadConfig` reports, and a caller that decides something on the
 * strength of this answer gets the strictest environment instead of a typo's licence. The
 * session stand-in, the create-account and sign-in screens, the password-reset availability
 * check, the development-only prototype routes and the field-test route all rely on that.
 */
export function appEnvironment(source: PublicEnvSource = declaredPublicEnv()): AppEnvironment {
  const result = parseEnvironment(source[PUBLIC_ENV_VARS.appEnvironment]);

  return 'environment' in result ? result.environment : 'production';
}

export type ZoneSourceKind = 'api' | 'stub';

/**
 * Where the map's zones come from: the team API (ADR-065), unless a non-production build asks
 * for the bundled stub by name with `EXPO_PUBLIC_ZONE_SOURCE=stub`. The layout harness does,
 * because it opens every screen on a fresh load with no session, and `/zones` needs one.
 * A production build always reads the API, and an unrecognised value reads the API too.
 */
export function zoneSourceKind(source: PublicEnvSource = declaredPublicEnv()): ZoneSourceKind {
  const asked = source[PUBLIC_ENV_VARS.zoneSource]?.trim();

  return asked === 'stub' && appEnvironment(source) !== 'production' ? 'stub' : 'api';
}

/**
 * Pure configuration loader. Collects every problem it finds so the app can
 * report all misconfiguration at once instead of one error per restart.
 */
export function loadConfig(source: PublicEnvSource = declaredPublicEnv()): ConfigResult {
  const problems: ConfigProblem[] = [];

  const environmentResult = parseEnvironment(source[PUBLIC_ENV_VARS.appEnvironment]);
  if ('problem' in environmentResult) {
    problems.push(environmentResult.problem);
  }
  const environment: AppEnvironment =
    'environment' in environmentResult ? environmentResult.environment : 'development';

  const urlResult = parseApiBaseUrl(source[PUBLIC_ENV_VARS.apiBaseUrl], {
    allowInsecureLoopback: environment === 'development',
    allowInsecureLocalNetwork: environment === 'development',
  });
  if (!urlResult.ok) {
    problems.push({ variable: PUBLIC_ENV_VARS.apiBaseUrl, reason: urlResult.reason });
    return { ok: false, problems };
  }
  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    config: {
      environment,
      apiBaseUrl: urlResult.url,
    },
  };
}

export type DevelopmentHost = {
  /** The platform the bundle runs on (`Platform.OS`). */
  platform: string;
  /**
   * The host the bundle was served from, as Expo reports it (`Constants.expoConfig.hostUri`,
   * e.g. `192.168.1.20:8081`), or nothing when it is unknown.
   */
  devServerHostUri?: string | null;
};

/**
 * Where a development build on a device should send the API's requests.
 *
 * `.env` names the API as `http://localhost:3000`, which is right for the web build and the iOS
 * simulator on the same machine, and wrong everywhere else: on a phone and in the Android
 * emulator `localhost` is the device itself, so every request failed and the map — which draws
 * only once its zones arrive — never loaded. A loopback API URL on a native platform is therefore
 * pointed at the machine Metro is serving from (the same host the bundle came from), keeping the
 * configured scheme, port and path; with no Metro host to go by, the Android emulator's own alias
 * for its host (`10.0.2.2`) is used. Only `development` is rewritten, and only a loopback URL.
 */
export function resolveDevelopmentApiBaseUrl(config: AppConfig, host: DevelopmentHost): AppConfig {
  if (config.environment !== 'development' || host.platform === 'web') return config;

  const parsed = parseAbsoluteUrl(config.apiBaseUrl);
  if (!parsed || !isLoopbackHost(parsed.hostname)) return config;

  const metroHost = host.devServerHostUri
    ?.trim()
    .replace(/^[a-z]+:\/\//i, '')
    .split(/[/:]/)[0];
  const target =
    metroHost && !isLoopbackHost(metroHost)
      ? metroHost
      : host.platform === 'android'
        ? '10.0.2.2'
        : null;
  if (target === null) return config;

  const port = parsed.host.startsWith('[')
    ? parsed.host.slice(parsed.host.indexOf(']') + 1)
    : parsed.host.slice(parsed.hostname.length);

  return { ...config, apiBaseUrl: `${parsed.protocol}://${target}${port}${parsed.path}` };
}
