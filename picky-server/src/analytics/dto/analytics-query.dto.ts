import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';

export class MyAnalyticsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(365)
  days = 30;

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(20)
  top = 5;
}

export class ZoneAnalyticsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(90)
  days = 30;
}
