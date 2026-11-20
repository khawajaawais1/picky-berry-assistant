import { ValidateIf } from 'class-validator';
import {
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 30)
  nickname?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(100)
  alert_radius_km?: number;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @IsString({ each: true })
  species_interest?: string[];

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['fi', 'en'])
  lang?: 'fi' | 'en';
}
