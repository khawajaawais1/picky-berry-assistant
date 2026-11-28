import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { SPECIES_CODES } from '../../species/species.constants';

export class RecomputeDto {
  @IsOptional()
  @IsUUID()
  zone_id?: string;

  @IsOptional()
  @IsIn(SPECIES_CODES)
  species?: string;
}
