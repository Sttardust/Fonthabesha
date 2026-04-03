import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateAdminStyleDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  weightClass?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  weightLabel?: string | null;

  @IsOptional()
  @IsBoolean()
  isItalic?: boolean;

  @IsOptional()
  @IsBoolean()
  isVariable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  versionLabel?: string | null;
}
