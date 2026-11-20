import { IsIn, IsOptional, IsString } from 'class-validator';

export class ExplanationQueryDto {
  @IsString()
  species!: string;

  @IsOptional()
  @IsIn(['fi', 'en'])
  lang: 'fi' | 'en' = 'en';
}
