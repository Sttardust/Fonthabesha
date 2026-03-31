import { Type } from 'class-transformer';
import { AuthAuditAction, AuthAuditOutcome } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AuthAuditQueryDto {
  @IsOptional()
  @IsEnum(AuthAuditAction)
  action?: AuthAuditAction;

  @IsOptional()
  @IsEnum(AuthAuditOutcome)
  outcome?: AuthAuditOutcome;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

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
