import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  legalFullName?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  organizationName?: string | null;

  @IsOptional()
  @IsString()
  @Length(7, 40)
  phoneNumber?: string | null;
}
