import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';

/** One-based paging, capped so an admin screen cannot ask for the whole database. */
export class PaginationDto {
  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(100)
  page_size = 25;
}
