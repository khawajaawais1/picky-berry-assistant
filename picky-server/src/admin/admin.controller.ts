import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DbService } from '../db/db.service';
import { Roles } from '../common/decorators/roles.decorator';
import { JobsService } from '../jobs/jobs.service';
import { SpeciesService } from '../species/species.service';
import { RecomputeDto } from './dto/recompute.dto';

@Controller('admin/scores')
export class AdminController {
  constructor(
    private readonly jobs: JobsService,
    private readonly database: DbService,
    private readonly species: SpeciesService,
  ) {}

  @Post('recompute')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Roles('admin')
  async recompute(@Body() body: RecomputeDto = new RecomputeDto()) {
    if (body.species && !body.zone_id) {
      throw new UnprocessableEntityException(
        'species can only be supplied with zone_id.',
      );
    }
    if (body.zone_id) {
      const zone = await this.database.pool.query(
        'SELECT 1 FROM zones WHERE id = $1',
        [body.zone_id],
      );
      if (!zone.rowCount) {
        throw new NotFoundException('Zone not found.');
      }
      if (body.species) await this.species.validate(body.species);
      return this.jobs.enqueue(
        'recompute_zone_score',
        {
          zone_id: body.zone_id,
          ...(body.species ? { species: body.species } : {}),
        },
        `recompute:${body.zone_id}`,
      );
    }
    return this.jobs.enqueue('recompute_all', {}, 'recompute_all');
  }
}
