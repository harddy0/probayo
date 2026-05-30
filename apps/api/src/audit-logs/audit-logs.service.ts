import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuditAction,
  AuditEntityType,
  Prisma,
} from '@prisma/client';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

export interface RecordAuditLogParams {
  actorUserId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an audit log entry.
   * This is a fire-and-forget method that never throws,
   * so audit failures don't affect the primary operation.
   */
  async record(params: RecordAuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Never throw - audit failures must not block primary operations
    }
  }

  /**
   * Query audit logs with filtering and pagination.
   */
  async findAll(query: AuditLogQueryDto) {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 50), 100);
    const skip = (page - 1) * limit;

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return {
      data: items.map((log) => ({
        id: log.id,
        actor: {
          id: log.actorUser.id,
          fullName:
            [log.actorUser.firstName, log.actorUser.lastName]
              .filter(Boolean)
              .join(' ') || log.actorUser.email,
          email: log.actorUser.email,
        },
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata as Record<string, unknown> | null,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      })),
      meta: {
        itemsPerPage: limit,
        totalItems,
        currentPage: page,
        totalPages,
      },
    };
  }
}
