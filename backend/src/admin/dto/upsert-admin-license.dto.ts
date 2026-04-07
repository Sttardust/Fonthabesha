import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertAdminLicenseDto {
  @IsString()
  @MaxLength(80)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summaryEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summaryAm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  fullTextUrl?: string;

  @IsBoolean()
  allowsRedistribution!: boolean;

  @IsBoolean()
  allowsCommercialUse!: boolean;

  @IsBoolean()
  requiresAttribution!: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
