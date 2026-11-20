import { Module } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

@Module({
  controllers: [VisitsController],
  providers: [VisitsService, JobsService],
})
export class VisitsModule {}
