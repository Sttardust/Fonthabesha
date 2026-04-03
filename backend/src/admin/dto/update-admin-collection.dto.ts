import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminCollectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  titleAm?: string | null;

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
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';
}
