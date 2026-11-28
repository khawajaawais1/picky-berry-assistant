import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { SPECIES_CODES } from './create-report.dto';

export class FeedbackRatingDto {
  @IsIn(SPECIES_CODES)
  species!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(200)
  amount_l?: number;
}

export class FeedbackSubmissionDto {
  @IsUUID()
  submission_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => FeedbackRatingDto)
  ratings!: FeedbackRatingDto[];
}

export class CreateZoneFeedbackDto extends FeedbackSubmissionDto {
  @IsUUID()
  zone_id!: string;
}
