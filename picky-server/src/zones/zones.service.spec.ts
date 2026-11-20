import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { DbService } from '../db/db.service';
import { SpeciesService } from '../species/species.service';
import { ExplanationService } from './explanation/explanation.service';
import { ZonesService } from './zones.service';

describe('ZonesService.nearby', () => {
  it('returns nearest geofences without requiring a species or score rows', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          h3: '881260000000000',
          name: 'Forest zone',
          lat: 62.2431,
          lng: 25.7482,
          distance_km: 0.43,
        },
      ],
    });
    const database = { pool: { query } };
    const species = { validate: jest.fn() };
    const logger = { setContext: jest.fn() };
    const service = new ZonesService(
      database as unknown as DbService,
      species as unknown as SpeciesService,
      {} as ConfigService,
      logger as unknown as PinoLogger,
      {} as ExplanationService,
    );

    await expect(
      service.nearby(62.24, 25.75, undefined, 10, 20, 'distance'),
    ).resolves.toEqual({
      origin: { lat: 62.24, lng: 25.75 },
      radius_km: 10,
      zones: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Forest zone',
          h3: '881260000000000',
          centroid: { lat: 62.2431, lng: 25.7482 },
          distance_km: 0.4,
        },
      ],
    });

    expect(species.validate).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      expect.not.stringContaining('zone_scores_current'),
      [25.75, 62.24, 10_000, 20],
    );
  });
});
