import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateTicketDto } from './create-ticket.dto';
import { TicketStatus } from '@prisma/client';
import { CreateKnownIssueInlineDto } from './create-known-issue-inline.dto';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
  @ApiPropertyOptional({
    description:
      'IT staff assigned to this ticket (admin assignment auto-acknowledges open tickets)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  assignedToUserId?: string | null;

  @ApiPropertyOptional({
    description:
      'Current status of the ticket (accepts enum values or snake_case)',
    enum: TicketStatus,
    example: 'pending_user',
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

  @ApiPropertyOptional({
    description:
      'Accept the ticket (acknowledge and self-assign to the current IT staff)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  accept?: boolean;

  @ApiPropertyOptional({
    description: 'Create a known issue and attach it to this ticket',
    type: CreateKnownIssueInlineDto,
  })
  @ValidateNested()
  @Type(() => CreateKnownIssueInlineDto)
  @IsOptional()
  createKnownIssue?: CreateKnownIssueInlineDto;
}
