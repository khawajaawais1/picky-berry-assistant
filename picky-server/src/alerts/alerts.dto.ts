import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { parseNumericInput } from '../common/utils/numeric-input';

export class AlertsQueryDto {
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
  limit = 20;
}
