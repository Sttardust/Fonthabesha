import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertVocabularyEntryDto {
  @IsIn(['category', 'tag', 'publisher', 'designer'])
  type!: 'category' | 'tag' | 'publisher' | 'designer';

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameAm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bioEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bioAm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;
}
