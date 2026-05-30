import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { AuditAction, AuditEntityType } from '@prisma/client';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Query audit logs with filtering and pagination',
    description:
      'Returns a paginated list of audit log entries. Requires authentication. ' +
      'Filter by entity type, entity ID, action, and/or actor user ID.',
  })
  @ApiQuery({
    name: 'entityType',
    required: false,
    enum: AuditEntityType,
    description: 'Filter by entity type (e.g., ticket, comment, user)',
  })
  @ApiQuery({
    name: 'entityId',
    required: false,
    type: String,
    description: 'Filter by the ID of the affected entity',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: AuditAction,
    description: 'Filter by action type',
  })
  @ApiQuery({
    name: 'actorUserId',
    required: false,
    type: String,
    description: 'Filter by the user who performed the action',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based, default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (max 100, default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated audit log entries',
    type: [AuditLogResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Query() query: AuditLogQueryDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.auditLogsService.findAll(query);
  }
}
