import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';

export const SPECIES_CODES = [
  'bilberry',
  'lingonberry',
  'cloudberry',
  'crowberry',
] as const;

export class CreateReportDto {
  /** The app's own id for the report, so an outbox replay stores it once. */
  @IsUUID()
  client_id!: string;

  @IsUUID()
  zone_id!: string;

  @IsIn(SPECIES_CODES)
  species!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === null ? undefined : value,
  )
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(500)
  amount_kg?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  minutes?: number;

  @IsOptional()
  @IsUUID()
  visit_id?: string;

  @IsDateString({ strict: true })
  recorded_at!: string;
}

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
