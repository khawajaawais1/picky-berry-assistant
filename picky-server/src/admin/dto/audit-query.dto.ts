import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';
import { PaginationDto } from './pagination.dto';

export class AuditQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  target_type?: string;

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}
