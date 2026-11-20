import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { JobsService } from '../jobs/jobs.service';
import { SpeciesModule } from '../species/species.module';

@Module({
  imports: [SpeciesModule],
  controllers: [AdminController],
  providers: [JobsService],
})
export class AdminModule {}
