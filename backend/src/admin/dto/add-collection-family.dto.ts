import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddCollectionFamilyDto {
  @IsString()
  familyId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
