import { Transform } from 'class-transformer';
import {
  IsInt,
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
}
