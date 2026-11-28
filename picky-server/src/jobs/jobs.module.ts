import { Module } from '@nestjs/common';
import { MlModule } from '../ml/ml.module';
import { InternalJobsController } from './internal-jobs.controller';
import { JobsRunnerService } from './jobs-runner.service';
import { JobsService } from './jobs.service';
import { MlJobsService } from './ml-jobs.service';

@Module({
  imports: [MlModule],
  controllers: [InternalJobsController],
  providers: [JobsService, JobsRunnerService, MlJobsService],
  exports: [JobsService, JobsRunnerService],
})
export class JobsModule {}
