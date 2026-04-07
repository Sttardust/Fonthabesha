import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterContributorDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @IsString()
  @MaxLength(120)
  displayName!: string;

  @IsString()
  @MaxLength(160)
  legalFullName!: string;

  @IsString()
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  organizationName?: string | null;

  @IsOptional()
  @IsString()
  @Length(7, 40)
  phoneNumber?: string | null;
}
