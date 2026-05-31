import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  ArrayNotEmpty,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { TicketStatus } from '@prisma/client';

export class BulkStatusDto {
  @ApiProperty({
    description: 'Array of ticket IDs to update',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ticketIds!: string[];

  @ApiProperty({
    description: 'New status to apply to all specified tickets',
    enum: TicketStatus,
    example: TicketStatus.InProgress,
  })
  @IsEnum(TicketStatus)
  @IsNotEmpty()
  status!: TicketStatus;
}
