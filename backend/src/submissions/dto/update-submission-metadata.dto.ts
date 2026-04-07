import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateSubmissionMetadataDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  familyNameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  familyNameAm?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nativeName?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionEn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionAm?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  primaryLanguage?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsBoolean()
  supportsLatin?: boolean;
}
