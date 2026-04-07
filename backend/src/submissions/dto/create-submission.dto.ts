import { OwnershipEvidenceType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  familyNameEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  familyNameAm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nativeName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionAm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  primaryLanguage?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsUUID()
  declaredLicenseId!: string;

  @IsEnum(OwnershipEvidenceType)
  ownershipEvidenceType!: OwnershipEvidenceType;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  ownershipEvidenceValue!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  contributorStatementText!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  termsAcceptanceName!: string;

  @IsOptional()
  @IsBoolean()
  supportsLatin?: boolean;
}
