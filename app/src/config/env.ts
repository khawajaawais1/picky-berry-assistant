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
  firebaseApiKey: 'EXPO_PUBLIC_FIREBASE_API_KEY',
} as const;

export type PublicEnvSource = Partial<Record<string, string | undefined>>;

export type AppEnvironment = 'development' | 'preview' | 'production';

const APP_ENVIRONMENTS: readonly AppEnvironment[] = ['development', 'preview', 'production'];

export type AppConfig = {
  environment: AppEnvironment;
  /** Normalised absolute base URL of the Picky API. */
  apiBaseUrl: string;
  /**
   * Firebase's public Web API key, or `null` when no reset provider is configured. It is public
   * by design — it identifies the Firebase project rather than authorising access — and an empty
   * value is the test-build path: the stand-in accepts the request and sends nothing.
   */
  firebaseApiKey: string | null;
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
  options: { allowInsecureLoopback?: boolean } = {},
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
    !(options.allowInsecureLoopback && isLoopbackHost(parsed.hostname))
  ) {
    return {
      ok: false,
      reason: 'must use https (clear-text http is only allowed for loopback hosts)',
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
 * callers are `verifyCode` in the session seam, where the strict answer is what keeps a stand-in
 * for a missing account service out of a shipped build (ADR-027), and the sign-in prototype's
 * gate on the `/create-account` route.
 */
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
    [PUBLIC_ENV_VARS.firebaseApiKey]: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  };
}

/**
 * Firebase's public Web API key, or `null` when the build has none.
 *
 * This key is **not a secret**: Firebase's client keys identify a project and are safe in a
 * shipped bundle when the project's API restrictions and quotas are set (SECURITY.md). It is read
 * here, in the one module allowed to touch `EXPO_PUBLIC_*`, and never logged.
 */
export function firebaseApiKey(source: PublicEnvSource = declaredPublicEnv()): string | null {
  const key = source[PUBLIC_ENV_VARS.firebaseApiKey]?.trim();

  return key ? key : null;
}

export function appEnvironment(source: PublicEnvSource = declaredPublicEnv()): AppEnvironment {
  const result = parseEnvironment(source[PUBLIC_ENV_VARS.appEnvironment]);

  return 'environment' in result ? result.environment : 'production';
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
      firebaseApiKey: firebaseApiKey(source),
    },
  };
}
