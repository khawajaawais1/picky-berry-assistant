import { Module } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { SpeciesModule } from '../species/species.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [SpeciesModule],
  controllers: [AdminController],
  providers: [AdminService, JobsService],
})
export class AdminModule {}
