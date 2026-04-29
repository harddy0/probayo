import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAssetDto {
  @ApiPropertyOptional({
    description: 'Unique identifier for the asset',
    example: '3f2e4a2b-8e6e-4f8c-9b5f-8d3c7a6c1d22',
  })
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({
    description: 'User ID currently assigned to the asset',
    example: '3f2e4a2b-8e6e-4f8c-9b5f-8d3c7a6c1d22',
  })
  @IsOptional()
  assignedToUserId?: string | null;

  @ApiPropertyOptional({
    description: 'Unique asset tag',
    example: 'IT-2026-0001',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  assetTag?: string | null;

  @ApiProperty({
    description: 'Device type',
    example: 'Laptop',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  deviceType!: string;

  @ApiPropertyOptional({
    description: 'Brand name',
    example: 'Dell',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string | null;

  @ApiPropertyOptional({
    description: 'Model name',
    example: 'Latitude 5440',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string | null;

  @ApiPropertyOptional({
    description: 'Unique serial number',
    example: 'SN123456789',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string | null;

  @ApiPropertyOptional({
    description: 'Purchase date',
    example: '2026-04-29',
  })
  @IsOptional()
  @IsDateString()
  purchasedAt?: string | null;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Assigned to finance team.',
  })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
