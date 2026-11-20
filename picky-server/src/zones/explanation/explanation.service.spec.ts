import { PinoLogger } from 'nestjs-pino';
import { ExplanationService } from './explanation.service';
import { REASON_TEMPLATES } from './templates';

describe('ExplanationService', () => {
  const warn = jest.fn();
  const logger = {
    setContext: jest.fn(),
    warn,
  } as unknown as PinoLogger;
  const service = new ExplanationService(logger);
  const inputs = {
    gdd_since_apr1: 812,
    gdd_ripe: 780,
    reports_7d: 4,
    avg_rating_7d: 4.2,
    suitability: 0.9,
  };

  it('renders every supported reason in Finnish and English with filled values', () => {
    for (const [code, template] of Object.entries(REASON_TEMPLATES)) {
      for (const lang of ['fi', 'en'] as const) {
        const result = service.renderReason(code, inputs, lang);
        expect(result).not.toContain('{');
        expect(result.length).toBeGreaterThan(0);
        expect(template[lang]).toBeDefined();
      }
    }
    expect(service.renderReason('ripe_by_gdd', inputs, 'en')).toContain('812');
    expect(service.renderReason('recent_reports_high', inputs, 'fi')).toContain(
      '4.2',
    );
    expect(service.renderReason('good_habitat', inputs, 'en')).toContain('90%');
  });

  it('logs unknown codes and returns localized fallback text', () => {
    expect(service.renderReason('unknown_code', {}, 'en')).toBe(
      'No additional explanation is available.',
    );
    expect(service.renderReason('unknown_code', {}, 'fi')).toBe(
      'Lisätietoja ei ole saatavilla.',
    );
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
