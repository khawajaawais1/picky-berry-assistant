import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';

export class AnalyticsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(90)
  days = 30;
}
