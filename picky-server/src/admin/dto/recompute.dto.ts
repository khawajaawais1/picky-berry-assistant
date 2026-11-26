import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class RecomputeDto {
  @IsOptional()
  @IsUUID()
  zone_id?: string;

  @IsOptional()
  @IsString()
  species?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
