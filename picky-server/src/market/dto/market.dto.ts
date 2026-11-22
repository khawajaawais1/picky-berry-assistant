import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';
import { SPECIES_CODES } from '../../reports/dto/create-report.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListingsQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(0, 80)
  q?: string;

  @IsOptional()
  @IsIn(SPECIES_CODES)
  species?: string;

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 30;
}

export class CreateListingDto {
  @IsIn(SPECIES_CODES)
  species!: string;

  @Transform(trim)
  @IsString()
  @Length(3, 80)
  title!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  price_cents!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(1000)
  available_kg!: number;

  @Transform(trim)
  @IsString()
  @Length(1, 80)
  area!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 80)
  town!: string;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsDateString({ strict: true })
  harvested_on!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 120)
  pickup_place!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 40)
  pickup_window!: string;
}

export class SendMessageDto {
  @Transform(trim)
  @IsString()
  @Length(1, 1000)
  body!: string;

  /** Required when the seller writes: which buyer's thread the reply goes to. */
  @IsOptional()
  @IsUUID()
  buyer_id?: string;
}

export class ThreadQueryDto {
  @IsOptional()
  @IsUUID()
  buyer_id?: string;
}

export class CreateOrderDto {
  @IsUUID()
  listing_id!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(1000)
  kilograms!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  pickup_time!: string;
}
