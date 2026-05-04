import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateTicketCategoryDto {
  @ApiProperty({
    description: 'Name of the ticket category',
    example: 'Hardware',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of what this category covers',
    example:
      'Issues related to physical hardware including laptops, desktops, printers, and peripherals',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Whether this category is active and can be used for new tickets',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
