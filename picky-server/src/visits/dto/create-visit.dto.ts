import { IsBoolean, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateVisitDto {
  @IsUUID()
  client_id!: string;

  @IsUUID()
  zone_id!: string;

  @IsDateString({ strict: true })
  started_at!: string;

  @IsDateString({ strict: true })
  ended_at!: string;

  @IsOptional()
  @IsBoolean()
  manual = false;
}
