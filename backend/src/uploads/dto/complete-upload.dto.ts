import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CompleteUploadDto {
  @IsUUID()
  uploadId!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i)
  sha256?: string;
}
