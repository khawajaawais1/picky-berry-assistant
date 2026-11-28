import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SPECIES_CODES } from '../../species/species.constants';

export class RecomputeDto {
  @IsOptional()
  @IsUUID()
  zone_id?: string;

  @IsOptional()
  @IsIn(SPECIES_CODES)
  species?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
