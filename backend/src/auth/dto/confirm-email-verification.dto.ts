import { IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmEmailVerificationDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  token!: string;
}
