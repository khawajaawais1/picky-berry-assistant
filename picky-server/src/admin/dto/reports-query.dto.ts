import { Transform } from 'class-transformer';
import {
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';
import { PaginationDto } from './pagination.dto';

export class ReportsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  species?: string;

  @IsOptional()
  @IsUUID()
  zone_id?: string;

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(5)
  min_rating?: number;

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(5)
  max_rating?: number;

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1)
  max_trust?: number;

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;

  @IsOptional()
  @IsIn(['newest', 'oldest'])
  sort: 'newest' | 'oldest' = 'newest';
}
