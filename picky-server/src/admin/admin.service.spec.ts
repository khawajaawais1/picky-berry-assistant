import { UnprocessableEntityException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { JobsService } from '../jobs/jobs.service';
import { SpeciesService } from '../species/species.service';
import { AdminService } from './admin.service';

describe('AdminService recompute de-duplication', () => {
  const zoneId = '41d28714-df79-4218-bb99-308bca35cd6c';
  const actorId = '00000000-0000-4000-8000-000000000001';
  let service: AdminService;
  let query: jest.Mock;
  let enqueue: jest.Mock;
  let validate: jest.Mock;

  beforeEach(() => {
    query = jest
      .fn()
      .mockResolvedValue({ rowCount: 1, rows: [{ id: zoneId }] });
    enqueue = jest.fn().mockResolvedValue({
      job_id: 7,
      status: 'queued',
      deduplicated: false,
    });
    validate = jest.fn().mockResolvedValue(undefined);
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    service = new AdminService(
      {
        pool: {
          query,
          connect: jest.fn().mockResolvedValue(client),
        },
      } as unknown as DbService,
      { enqueue } as unknown as JobsService,
      { validate } as unknown as SpeciesService,
    );
  });

  it('keeps a separate queued job for each species in a zone', async () => {
    await service.recompute(
      { zone_id: zoneId, species: 'bilberry' },
      actorId,
      'req-bilberry',
    );
    await service.recompute(
      { zone_id: zoneId, species: 'lingonberry' },
      actorId,
      'req-lingonberry',
    );

    const calls = enqueue.mock.calls as [
      string,
      Record<string, unknown>,
      string,
    ][];
    expect(validate).toHaveBeenNthCalledWith(1, 'bilberry');
    expect(validate).toHaveBeenNthCalledWith(2, 'lingonberry');
    expect(calls.map((call) => call[2])).toEqual([
      `recompute:${zoneId}:bilberry`,
      `recompute:${zoneId}:lingonberry`,
    ]);
    expect(calls[1][1]).toEqual({
      zone_id: zoneId,
      species: 'lingonberry',
    });
  });

  it('keeps the zone-wide key used by the visits service stable', async () => {
    await service.recompute({ zone_id: zoneId }, actorId, 'req-zone');

    const calls = enqueue.mock.calls as [
      string,
      Record<string, unknown>,
      string,
    ][];
    expect(calls[0][2]).toBe(`recompute:${zoneId}`);
    expect(calls[0][1]).toEqual({ zone_id: zoneId });
  });

  it('rejects a species without a zone', async () => {
    await expect(
      service.recompute({ species: 'bilberry' }, actorId, 'req-invalid'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(query).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });
});
