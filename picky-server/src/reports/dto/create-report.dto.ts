import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';
import { SPECIES_CODES } from '../../species/species.constants';

export { SPECIES_CODES } from '../../species/species.constants';

export class ZoneReportsQueryDto {
  @IsOptional()
  @IsIn(SPECIES_CODES)
  species?: string;

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

export class SeasonQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;
}
