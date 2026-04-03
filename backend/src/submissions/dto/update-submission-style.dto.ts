import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateSubmissionStyleDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(900)
  weightClass?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  weightLabel?: string;

  @IsOptional()
  @IsBoolean()
  isItalic?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
