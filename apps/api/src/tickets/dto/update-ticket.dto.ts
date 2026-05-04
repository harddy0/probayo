import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CreateTicketDto } from './create-ticket.dto';
import { TicketStatus } from '@prisma/client';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
  @ApiPropertyOptional({
    description: 'IT staff assigned to this ticket',
    example: '123e4567-e89b-12d3-a456-426614174002',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  assignedToUserId?: string | null;

  @ApiPropertyOptional({
    description: 'Current status of the ticket',
    enum: TicketStatus,
    example: 'in_progress',
  })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: 'Known issue ID if this ticket is related to a known problem',
    example: '123e4567-e89b-12d3-a456-426614174003',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  knownIssueId?: string | null;

  @ApiPropertyOptional({
    description: 'Department ID (can be changed by IT staff)',
    example: '123e4567-e89b-12d3-a456-426614174004',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string | null;
}
