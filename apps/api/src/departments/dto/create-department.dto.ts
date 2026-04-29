import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Department id',
    example: '123',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  id!: string;

  @ApiProperty({
    description: 'Department name',
    example: 'Information Technology',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'User ID of the department head',
    example: '3f2e4a2b-8e6e-4f8c-9b5f-8d3c7a6c1d22',
  })
  @IsOptional()
  @IsUUID()
  headUserId?: string | null;
}
