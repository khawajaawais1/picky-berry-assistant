import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';

export class ZonesQueryDto {
  @IsString()
  bbox!: string;

  @IsString()
  species!: string;

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  zoom = 12;
}
