import { Module } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/** Features 6.4 and 6.8: picker reports, a zone's report list and the picker's season. */
@Module({
  controllers: [ReportsController],
  providers: [ReportsService, JobsService],
})
export class ReportsModule {}
