/**
 * Browser origins allowed to call the API. The field app is native (it sends no Origin),
 * while the operator console is a separate SPA, so cross-origin access is limited to
 * explicit origins. A wildcard is refused: it would let any site call the API with a
 * stolen token.
 */
export const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
] as const;

export function parseCorsOrigins(raw: string | undefined): string[] {
  const values = raw?.trim() ? raw.split(',') : DEFAULT_CORS_ORIGINS;
  const origins = new Set<string>();

  for (const candidate of values) {
    const value = candidate.trim();
    if (!value) continue;
    if (value === '*') {
      throw new Error(
        'CORS_ORIGINS must list explicit origins; "*" is not allowed.',
      );
    }

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`CORS_ORIGINS contains an invalid origin: ${value}`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`CORS_ORIGINS must use http or https: ${value}`);
    }
    if (
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        `CORS_ORIGINS entries must be bare origins, without a path or credentials: ${value}`,
      );
    }
    origins.add(url.origin);
  }

  return [...origins];
}
