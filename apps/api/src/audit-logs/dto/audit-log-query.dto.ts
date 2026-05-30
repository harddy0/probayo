import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction, AuditEntityType } from '@prisma/client';

export class AuditLogQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by entity type',
    enum: AuditEntityType,
    example: 'ticket',
  })
  @IsEnum(AuditEntityType)
  @IsOptional()
  entityType?: AuditEntityType;

  @ApiPropertyOptional({
    description: 'Filter by entity ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by action',
    enum: AuditAction,
    example: 'update',
  })
  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @ApiPropertyOptional({
    description: 'Filter by actor user ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsOptional()
  actorUserId?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (max 100)',
    example: 50,
    default: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
