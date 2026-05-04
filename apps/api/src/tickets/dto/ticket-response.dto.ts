import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriorityLevel, TicketStatus } from '@prisma/client';

class UserReferenceDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({ description: 'Full name', example: 'John Doe' })
  fullName: string | undefined;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  email: string | undefined;
}

class DepartmentReferenceDto {
  @ApiProperty({
    description: 'Department ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({
    description: 'Department name',
    example: 'Information Technology',
  })
  name: string | undefined;
}

class CategoryReferenceDto {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({ description: 'Category name', example: 'Hardware' })
  name: string | undefined;
}

class AssetReferenceDto {
  @ApiProperty({
    description: 'Asset ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({ description: 'Asset tag', example: 'IT-2026-0001' })
  assetTag: string | undefined;

  @ApiProperty({ description: 'Device type', example: 'Laptop' })
  deviceType: string | undefined;
}

export class TicketResponseDto {
  @ApiProperty({
    description: 'Ticket ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({
    description: 'Ticket title',
    example: 'VPN connection keeps dropping',
  })
  title: string | undefined;

  @ApiProperty({
    description: 'Ticket description',
    example: 'Every time I try to connect to the VPN...',
  })
  description: string | undefined;

  @ApiProperty({
    enum: PriorityLevel,
    description: 'Ticket priority',
    example: 'high',
  })
  priority: PriorityLevel | undefined;

  @ApiProperty({
    enum: TicketStatus,
    description: 'Current status',
    example: 'in_progress',
  })
  status: TicketStatus | undefined;

  @ApiProperty({
    description: 'Filed by user information',
    type: UserReferenceDto,
  })
  filedBy: UserReferenceDto | undefined;

  @ApiPropertyOptional({
    description: 'Assigned to user information',
    type: UserReferenceDto,
    nullable: true,
  })
  assignedTo?: UserReferenceDto | null;

  @ApiProperty({
    description: 'Department information',
    type: DepartmentReferenceDto,
  })
  department: DepartmentReferenceDto | undefined;

  @ApiProperty({
    description: 'Category information',
    type: CategoryReferenceDto,
  })
  category: CategoryReferenceDto | undefined;

  @ApiPropertyOptional({
    description: 'Asset information',
    type: AssetReferenceDto,
    nullable: true,
  })
  asset?: AssetReferenceDto | null;

  @ApiProperty({
    description: 'SLA acknowledgement deadline',
    example: '2024-01-15T10:00:00Z',
  })
  slaAckDeadline: Date | undefined;

  @ApiProperty({
    description: 'SLA resolution deadline',
    example: '2024-01-15T16:00:00Z',
  })
  slaResolutionDeadline: Date | undefined;

  @ApiProperty({
    description: 'Whether SLA acknowledgement was breached',
    example: false,
  })
  slaAckBreached: boolean | undefined;

  @ApiProperty({
    description: 'Whether SLA resolution was breached',
    example: false,
  })
  slaResolutionBreached: boolean | undefined;

  @ApiPropertyOptional({
    description: 'When ticket was acknowledged',
    nullable: true,
  })
  acknowledgedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'When ticket was resolved',
    nullable: true,
  })
  resolvedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'When ticket was closed',
    nullable: true,
  })
  closedAt?: Date | null;

  @ApiProperty({
    description: 'When ticket was created',
    example: '2024-01-15T08:00:00Z',
  })
  createdAt: Date | undefined;

  @ApiProperty({
    description: 'When ticket was last updated',
    example: '2024-01-15T09:30:00Z',
  })
  updatedAt: Date | undefined;

  @ApiPropertyOptional({
    description: 'Number of comments on this ticket',
    example: 5,
  })
  commentsCount?: number;

  @ApiPropertyOptional({
    description: 'Number of attachments on this ticket',
    example: 2,
  })
  attachmentsCount?: number;
}
