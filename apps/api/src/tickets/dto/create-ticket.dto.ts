import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { PriorityLevel } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({
    description: 'Ticket title/summary of the issue',
    example: 'VPN connection keeps dropping',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example:
      'Every time I try to connect to the VPN, it drops after 5 minutes. This started happening after the latest Windows update.',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    description: 'Category ID of the ticket (must be an active category)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @ApiPropertyOptional({
    description: 'Asset ID if the issue is related to a specific device',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsOptional()
  assetId?: string;

  @ApiPropertyOptional({
    description: 'Priority level of the ticket',
    enum: PriorityLevel,
    example: 'medium',
    default: 'medium',
  })
  @IsEnum(PriorityLevel)
  @IsOptional()
  priority?: PriorityLevel;
}
