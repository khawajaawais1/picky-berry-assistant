import { describe, expect, it } from 'vitest';
import { pageMeta } from '../AppShell';

describe('pageMeta', () => {
  it('returns a known title and description for each route', () => {
    expect(pageMeta('/').title).toBe('Overview');
    expect(pageMeta('/operations').title).toBe('Operations');
    expect(pageMeta('/zones/zone-12').title).toBe('Zone detail');
    expect(pageMeta('/users/u-204').title).toBe('Account detail');
  });

  it('falls back to a not-found entry for unknown routes', () => {
    expect(pageMeta('/nope').title).toBe('Not found');
    expect(pageMeta('/nope').description).toBe('This route does not exist.');
  });
});
