import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';

export class ZoneDetailQueryDto {
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
}
