import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RecomputeDto {
  @IsOptional()
  @IsUUID()
  zone_id?: string;

  @IsOptional()
  @IsString()
  species?: string;
}
