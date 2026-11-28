import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { MlModule } from '../ml/ml.module';
import { SpeciesModule } from '../species/species.module';
import { AdminController } from './admin.controller';
import { AdminMapService } from './admin-map.service';
import { AdminService } from './admin.service';

@Module({
  imports: [SpeciesModule, JobsModule, MlModule],
  controllers: [AdminController],
  providers: [AdminService, AdminMapService],
})
export class AdminModule {}
