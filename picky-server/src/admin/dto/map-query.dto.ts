import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MapQueryDto {
  /** Limit the map to zones with a current score for this species. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  species?: string;
}
