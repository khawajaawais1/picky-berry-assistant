import { createHash } from 'node:crypto';

export function buildEtag(
  parts: readonly (string | number | Date | null)[],
): string {
  const serialized = parts
    .map((part) =>
      part instanceof Date ? part.toISOString() : String(part ?? ''),
    )
    .join('|');
  return `W/"${createHash('sha1').update(serialized).digest('hex')}"`;
}

export function matchesEtag(header: string | undefined, etag: string): boolean {
  if (!header) return false;
  return header
    .split(',')
    .map((value) => value.trim())
    .some(
      (value) =>
        value === '*' ||
        value === etag ||
        value.replace(/^W\//, '') === etag.replace(/^W\//, ''),
    );
}
