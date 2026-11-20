import { Transform } from 'class-transformer';
import { IsInt, IsString, Max, Min } from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';

export class HistoryQueryDto {
  @IsString()
  species!: string;

  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(365)
  days = 30;
}
