import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsIn,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';

export class NearQueryDto {
  @Transform(({ value }) => parseNumericInput(value))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  lat!: number;

  @Transform(({ value }) => parseNumericInput(value))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  lng!: number;

  @ValidateIf((query: NearQueryDto) => query.sort === 'score')
  @IsString()
  species?: string;

  @IsOptional()
  @IsIn(['score', 'distance'])
  sort: 'score' | 'distance' = 'score';

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(50)
  radius_km = 10;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : parseNumericInput(value),
  )
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  get effectiveLimit(): number {
    return this.limit ?? (this.sort === 'distance' ? 20 : 10);
  }
}
