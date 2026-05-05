import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';
import { CreateTicketCategoryDto } from './create-category.dto';

export class UpdateTicketCategoryDto extends PartialType(
  CreateTicketCategoryDto,
) {
  @ApiPropertyOptional({
    description: 'Soft delete the category by setting deleted_at timestamp',
    example: '2024-01-01T00:00:00Z',
    nullable: true,
  })
  @IsDateString()
  @IsOptional()
  deletedAt?: Date | null;
}
