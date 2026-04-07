import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ReviewDecisionIssueDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ReviewDecisionIssueDto)
  issues?: ReviewDecisionIssueDto[];
}
