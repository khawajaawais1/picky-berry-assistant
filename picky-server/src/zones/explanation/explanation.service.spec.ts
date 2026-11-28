import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PinoLogger } from 'nestjs-pino';
import { ExplanationService } from './explanation.service';
import { ML_REASON_CODES, REASON_TEMPLATES } from './templates';

function reasonCodes(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) reasonCodes(item, found);
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      if (
        key === 'reasons' &&
        Array.isArray(child) &&
        child.every((code) => typeof code === 'string')
      ) {
        child.forEach((code) => found.add(code));
      } else {
        reasonCodes(child, found);
      }
    }
  }
  return found;
}

describe('ExplanationService', () => {
  const warn = jest.fn();
  const logger = {
    setContext: jest.fn(),
    warn,
  } as unknown as PinoLogger;
  const service = new ExplanationService(logger);
  const inputs = {
    site_class: 'good',
    site_potential: 0.9,
    window_start: '2026-07-10',
    window_end: '2026-08-29',
    year_index: 1,
    forest_share: 0.9,
    reports_used: 4,
    evidence_weight: 1,
  };

  it('has Finnish and English copy for all ML v2 and golden-fixture codes', () => {
    const fixtures = join(process.cwd(), 'test', 'fixtures', 'ml');
    const fixtureCodes = readdirSync(fixtures)
      .filter((name) => name.endsWith('.json'))
      .flatMap((name) => [
        ...reasonCodes(JSON.parse(readFileSync(join(fixtures, name), 'utf8'))),
      ]);
    const documentedCodes = [
      'in_ripe_window',
      'ripening_window',
      'before_window',
      'past_window',
      'off_season',
      'good_site',
      'moderate_site',
      'poor_site',
      'no_reports_baseline',
      'recent_reports_high',
      'recent_reports_low',
      'photo_confirms_species',
      'low_confidence_species',
    ];

    expect(new Set(ML_REASON_CODES)).toEqual(new Set(documentedCodes));
    for (const code of new Set([...fixtureCodes, ...documentedCodes])) {
      const template = REASON_TEMPLATES[code];
      expect(template?.fi).toBeDefined();
      expect(template?.en).toBeDefined();
      for (const lang of ['fi', 'en'] as const) {
        const rendered = service.renderReason(code, inputs, lang);
        expect(rendered).not.toMatch(/[{}]|undefined/);
      }
    }
  });

  it('formats season dates without local-time day shifts', () => {
    expect(service.renderReason('in_ripe_window', inputs, 'fi')).toContain(
      '10.7.–29.8.',
    );
    expect(service.renderReason('in_ripe_window', inputs, 'en')).toContain(
      '10 Jul to 29 Aug',
    );
  });

  it('falls back when a required value is missing or a code is unknown', () => {
    expect(service.renderReason('recent_reports_high', {}, 'en')).toBe(
      'No additional explanation is available.',
    );
    expect(service.renderReason('unknown_code', {}, 'fi')).toBe(
      'Lisätietoja ei ole saatavilla.',
    );
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
