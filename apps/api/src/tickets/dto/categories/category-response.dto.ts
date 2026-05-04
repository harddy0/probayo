import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({
    description: 'Category name',
    example: 'Hardware',
  })
  name: string | undefined;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Issues related to physical hardware',
  })
  description?: string | null;

  @ApiProperty({
    description: 'Whether category is active',
    example: true,
  })
  isActive: boolean | undefined;

  @ApiPropertyOptional({
    description: 'Number of tickets using this category',
    example: 42,
  })
  ticketCount?: number;

  @ApiPropertyOptional({
    description: 'Soft delete timestamp',
    nullable: true,
  })
  deletedAt?: Date | null;

  @ApiProperty({
    description: 'When category was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt?: Date;
}
