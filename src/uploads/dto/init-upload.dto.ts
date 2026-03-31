import { IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class InitUploadDto {
  @IsUUID()
  submissionId!: string;

  @IsString()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @MaxLength(255)
  @Matches(/^(font\/\w[\w.+-]*|application\/octet-stream)$/)
  contentType!: string;
}
