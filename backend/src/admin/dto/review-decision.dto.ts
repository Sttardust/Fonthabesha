import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
