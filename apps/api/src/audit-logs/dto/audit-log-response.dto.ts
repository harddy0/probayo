import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction, AuditEntityType } from '@prisma/client';

class ActorUserDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({
    description: 'Full name',
    example: 'John Doe',
  })
  fullName: string | undefined;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  email: string | undefined;
}

export class AuditLogResponseDto {
  @ApiProperty({
    description: 'Audit log entry ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({
    description: 'User who performed the action',
    type: ActorUserDto,
  })
  actor: ActorUserDto | undefined;

  @ApiProperty({
    description: 'Action performed',
    enum: AuditAction,
    example: 'update',
  })
  action: AuditAction | undefined;

  @ApiProperty({
    description: 'Type of entity affected',
    enum: AuditEntityType,
    example: 'ticket',
  })
  entityType: AuditEntityType | undefined;

  @ApiProperty({
    description: 'ID of the affected entity',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  entityId: string | undefined;

  @ApiPropertyOptional({
    description: 'Additional metadata (previous values, changes, etc.)',
    example: { fromStatus: 'open', toStatus: 'in_progress' },
  })
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'IP address of the requester',
    example: '192.168.1.1',
  })
  ipAddress?: string | null;

  @ApiProperty({
    description: 'When the action occurred',
    example: '2024-01-15T08:00:00Z',
  })
  createdAt: Date | undefined;
}
