import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { MlClientService } from './ml-client.service';
import { MlExplanation } from './ml.types';

describe('MlClientService mock mode', () => {
  const explanation: MlExplanation = {
    model_version: 'zone-grid-jkl60-v2',
    rules_version: 'zone-score-rules-v2',
    reasons: ['in_ripe_window', 'good_site', 'no_reports_baseline'],
    inputs: {
      site_class: 'good',
      site_potential: 0.6,
      window_start: '2026-07-10',
      window_end: '2026-08-29',
      year_index: 1,
      forest_share: 0.9,
      reports_used: 0,
      evidence_weight: 0,
    },
  };

  it('matches the ML golden fusion for a fresh visit-backed photo report', async () => {
    const config = {
      getOrThrow: () => 'https://ml.example.test',
      get: (_key: string, defaultValue: unknown) =>
        _key === 'ML_MODE' ? 'mock' : defaultValue,
    } as unknown as ConfigService;
    const logger = {
      setContext: jest.fn(),
      warn: jest.fn(),
    } as unknown as PinoLogger;
    const client = new MlClientService(config, logger);
    const now = new Date();

    const result = await client.updateZoneScore({
      map_score: 55,
      map_confidence: 'medium',
      map_explanation: explanation,
      reports: [
        {
          created_at: now.toISOString(),
          rating: 4,
          photo_count: 32,
          reporter_trust: 1,
          visit_backed: true,
        },
      ],
      now: now.toISOString(),
    });

    expect(result.score).toBe(78);
    expect(result.s_feedback).toBe(100);
    expect(result.evidence_weight).toBe(1);
    expect(result.explanation.reasons).toContain('photo_confirms_species');
  });
});
