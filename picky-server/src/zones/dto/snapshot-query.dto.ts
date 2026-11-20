import { IsDateString, IsOptional, IsString } from 'class-validator';

export class SnapshotQueryDto {
  @IsString()
  bbox!: string;

  @IsOptional()
  @IsDateString()
  since?: string;
}
