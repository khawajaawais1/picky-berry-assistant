import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export const ZONE_SORTS = ['name', 'score', 'updated', 'reports'] as const;
export type ZoneSort = (typeof ZONE_SORTS)[number];

export class ZonesQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  species?: string;

  @IsOptional()
  @IsIn(ZONE_SORTS)
  sort: ZoneSort = 'name';
}
