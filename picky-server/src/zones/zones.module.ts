import { Module } from '@nestjs/common';
import { ZonesController } from './zones.controller';
import { ZonesService } from './zones.service';
import { SpeciesModule } from '../species/species.module';
import { ExplanationService } from './explanation/explanation.service';

@Module({
  imports: [SpeciesModule],
  controllers: [ZonesController],
  providers: [ZonesService, ExplanationService],
  exports: [ZonesService],
})
export class ZonesModule {}
