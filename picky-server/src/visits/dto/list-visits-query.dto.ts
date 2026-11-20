import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { parseNumericInput } from '../../common/utils/numeric-input';

export type VisitStatusFilter = 'accepted' | 'rejected' | 'all';

export class ListVisitsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseNumericInput(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsIn(['accepted', 'rejected', 'all'])
  status: VisitStatusFilter = 'accepted';
}
