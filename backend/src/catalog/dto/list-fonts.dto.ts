import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListFontsDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  script?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  license?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  publisher?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  variable?: boolean;

  @IsOptional()
  @IsIn(['popular', 'newest', 'alphabetical'])
  sort?: 'popular' | 'newest' | 'alphabetical';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
