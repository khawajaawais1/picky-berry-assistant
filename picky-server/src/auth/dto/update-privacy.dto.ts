import { ValidateIf } from 'class-validator';
import { IsBoolean, IsIn } from 'class-validator';

export class UpdatePrivacyDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['private', 'shared', 'public'])
  privacy_level?: 'private' | 'shared' | 'public';

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  background_location?: boolean;
}
