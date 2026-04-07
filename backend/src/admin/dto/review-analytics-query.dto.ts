import { Transform } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';

export class ReviewAnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return String(value).trim().toLowerCase();
  })
  timezone?: string;
}
