import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateAdminFamilyDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameAm?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nativeName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descriptionEn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descriptionAm?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  script?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  primaryLanguage?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  publisherId?: string | null;

  @IsOptional()
  @IsString()
  licenseId?: string | null;

  @IsOptional()
  @IsBoolean()
  supportsEthiopic?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsLatin?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  versionLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specimenTextDefaultAm?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specimenTextDefaultEn?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  designerIds?: string[];
}
