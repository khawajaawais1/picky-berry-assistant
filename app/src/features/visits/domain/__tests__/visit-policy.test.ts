import { DEFAULT_VISIT_POLICY, parseVisitPolicy } from '../visit-policy';

const VALID_POLICY = {
  version: 'policy-7',
  dwellMs: 300_000,
  graceMs: 1_800_000,
  maxVisitSpanDays: 1,
} as const;

describe('DEFAULT_VISIT_POLICY', () => {
  it('encodes the owner decision: 5 minute dwell, 30 minute grace, one day', () => {
    expect(DEFAULT_VISIT_POLICY.dwellMs).toBe(5 * 60_000);
    expect(DEFAULT_VISIT_POLICY.graceMs).toBe(30 * 60_000);
    expect(DEFAULT_VISIT_POLICY.maxVisitSpanDays).toBe(1);
  });

  it('carries a non-empty version so offline decisions can be reconciled', () => {
    expect(DEFAULT_VISIT_POLICY.version).not.toBe('');
  });
});

describe('parseVisitPolicy', () => {
  it('accepts a well-formed server policy', () => {
    expect(parseVisitPolicy(VALID_POLICY)).toEqual({ ok: true, policy: VALID_POLICY });
  });

  it('returns only the known fields and never echoes extra ones', () => {
    const result = parseVisitPolicy({ ...VALID_POLICY, isAdmin: true, dwellMs_: 9 });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected policy to be valid');
    expect(Object.keys(result.policy).sort()).toEqual([
      'dwellMs',
      'graceMs',
      'maxVisitSpanDays',
      'version',
    ]);
  });

  it.each([undefined, null, 'policy', 42, [], true])(
    'rejects the non-object payload %p',
    (payload) => {
      const result = parseVisitPolicy(payload);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected policy to be rejected');
      expect(result.problems.length).toBeGreaterThan(0);
      expect(result.problems.every((problem) => typeof problem === 'string')).toBe(true);
    },
  );

  it('rejects a missing or empty version', () => {
    for (const version of [undefined, '', '   ', 7]) {
      const result = parseVisitPolicy({ ...VALID_POLICY, version });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected policy to be rejected');
      expect(result.problems.join(' ')).toContain('version');
    }
  });

  it.each([0, -1, 1.5, 86_400_001, '300000', null])('rejects the dwell %p', (dwellMs) => {
    const result = parseVisitPolicy({ ...VALID_POLICY, dwellMs });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected policy to be rejected');
    expect(result.problems.join(' ')).toContain('dwellMs');
  });

  it.each([0, -1, 86_400_001, '1800000'])('rejects the grace window %p', (graceMs) => {
    const result = parseVisitPolicy({ ...VALID_POLICY, graceMs });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected policy to be rejected');
    expect(result.problems.join(' ')).toContain('graceMs');
  });

  it.each([0, -1, 8, 1.5])('rejects the calendar-day span %p', (maxVisitSpanDays) => {
    const result = parseVisitPolicy({ ...VALID_POLICY, maxVisitSpanDays });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected policy to be rejected');
    expect(result.problems.join(' ')).toContain('maxVisitSpanDays');
  });

  it('reports every problem at once instead of stopping at the first', () => {
    const result = parseVisitPolicy({ version: '', dwellMs: 0, graceMs: -5, maxVisitSpanDays: 99 });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected policy to be rejected');
    expect(result.problems).toHaveLength(4);
  });
});
