import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  targetUploadId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  targetStyleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  issueCode?: string;
}
