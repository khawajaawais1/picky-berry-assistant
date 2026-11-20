import { IsString, Length } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @Length(10, 128)
  password!: string;
}
