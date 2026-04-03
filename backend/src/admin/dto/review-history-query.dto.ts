import { Type } from 'class-transformer';
import { ReviewAction } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ReviewHistoryQueryDto {
  @IsOptional()
  @IsEnum(ReviewAction)
  action?: ReviewAction;

  @IsOptional()
  @IsIn(['feedback', 'decision', 'system', 'submission'])
  kind?: 'feedback' | 'decision' | 'system' | 'submission';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  issueCode?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
