import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/** Features 6.4 and 6.8: picker reports, a zone's report list and the picker's season. */
@Module({
  imports: [JobsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
