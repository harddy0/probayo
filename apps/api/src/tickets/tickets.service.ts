import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import type { File as MulterFile } from 'multer';
import { PrismaService } from '../prisma/prisma.service';
import { SlaService } from '../sla/sla.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateTicketCommentDto } from './dto/create-comment.dto';
import { UpdateTicketCommentDto } from './dto/update-comment.dto';
import {
  KnownIssueStatus,
  PriorityLevel,
  Prisma,
  TicketStatus,
  UserRole,
  AuditAction,
  AuditEntityType,
} from '@prisma/client';
import { CommentsService } from '../comments/comments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { IStorageService } from '../attachments/storage/storage.interface';

type TicketActor = {
  id: string;
  role: UserRole;
  departmentId?: string | null;
};

type TicketListQuery = Prisma.TicketWhereInput & {
  page?: number | string;
  limit?: number | string;
  search?: string;
  sortBy?: string[] | string;
};

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private prisma: PrismaService,
    private slaService: SlaService,
    private notificationsService: NotificationsService,
    private commentsService: CommentsService,
    private auditLogsService: AuditLogsService,
    @Inject('IStorageService') private storage: IStorageService,
  ) {}

  // ==================== CREATE TICKET ====================
  async create(userId: string, createTicketDto: CreateTicketDto) {
    // 1. Get user details
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { department: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.DepartmentHead) {
      throw new ForbiddenException('Department heads cannot file tickets');
    }

    if (!user.departmentId) {
      throw new BadRequestException(
        'User must belong to a department to file a ticket',
      );
    }

    // 2. Validate category exists and is active
    const category = await this.prisma.ticketCategory.findFirst({
      where: {
        id: createTicketDto.categoryId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!category) {
      throw new BadRequestException('Invalid or inactive ticket category');
    }

    // 3. Validate asset if provided
    if (createTicketDto.assetId) {
      const asset = await this.prisma.asset.findUnique({
        where: { id: createTicketDto.assetId },
      });
      if (!asset) {
        throw new BadRequestException('Asset not found');
      }
    }

    // 4. Set priority (default to medium if not provided)
    const priority = createTicketDto.priority || PriorityLevel.Medium;

    // 5. Calculate SLA deadlines and snapshot policy minutes
    const slaSnapshot = await this.slaService.buildTicketSlaSnapshot(priority);

    // 6. Create ticket
    const ticketData = {
      title: createTicketDto.title,
      description: createTicketDto.description,
      categoryId: createTicketDto.categoryId,
      assetId: createTicketDto.assetId,
      knownIssueId: createTicketDto.knownIssueId,
      priority: priority,
      status: TicketStatus.Open,
      filedByUserId: userId,
      departmentId: user.departmentId,
      slaAckMinutes: slaSnapshot.acknowledgementMinutes,
      slaResolutionMinutes: slaSnapshot.resolutionMinutes,
      slaAckDeadline: slaSnapshot.ackDeadline,
      slaResolutionDeadline: slaSnapshot.resolutionDeadline,
    };

    const ticket = await this.prisma.ticket.create({
      data: ticketData,
      include: {
        filedByUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedToUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        department: true,
        category: true,
        asset: true,
      },
    });

    // 7. Record status history
    await this.recordStatusHistory(ticket.id, null, TicketStatus.Open, userId);

    // 8. Notify IT staff about new ticket (async, non-blocking)
    const filedByName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

    const departmentName = user.department?.name || 'Unknown Department';

    // Fire and forget - don't await to avoid blocking response
    void this.notificationsService.notifyTicketCreated(
      ticket.id,
      ticket.title,
      filedByName,
      departmentName,
      ticket.priority,
    );

    // 9. Record audit log (async, non-blocking)
    void this.auditLogsService.record({
      actorUserId: userId,
      action: AuditAction.Create,
      entityType: AuditEntityType.Ticket,
      entityId: ticket.id,
      metadata: {
        title: ticket.title,
        priority: ticket.priority,
        status: ticket.status,
      },
    });

    return ticket;
  }

  // ==================== FIND ALL TICKETS (Role-based) ====================
  async findAll(userId: string, filters?: TicketListQuery) {
    const where: Prisma.TicketWhereInput = {};

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Role-based filtering
    if (user.role === UserRole.Employee) {
      where.filedByUserId = user.id;
    } else if (user.role === UserRole.DepartmentHead) {
      where.departmentId = user.departmentId ?? undefined;
    }
    // Admin and IT Staff see all tickets

    // Apply filters
    if (filters?.status) {
      const normalizedStatus = this.normalizeTicketStatus(
        filters.status as string,
      );
      if (!normalizedStatus) {
        throw new BadRequestException('Invalid status filter');
      }
      where.status = normalizedStatus;
    }
    if (filters?.priority) {
      where.priority = filters.priority;
    }
    if (filters?.assignedToUserId) {
      where.assignedToUserId = filters.assignedToUserId;
    }
    if (
      filters?.departmentId &&
      (user.role === UserRole.Admin || user.role === UserRole.ItStaff)
    ) {
      where.departmentId = filters.departmentId;
    }
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const page = this.parsePositiveNumber(filters?.page, 1);
    const limit = Math.min(this.parsePositiveNumber(filters?.limit, 50), 50);
    const orderBy = this.normalizeSortBy(filters?.sortBy);

    if (orderBy.length === 0) {
      orderBy.push({ priority: 'desc' }, { slaAckDeadline: 'asc' });
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: {
          filedByUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          assignedToUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          department: true,
          category: true,
          asset: true,
          _count: {
            select: {
              comments: true,
              attachments: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const links = this.buildPageLinks(filters, page, totalPages, limit);

    return {
      data: items,
      meta: {
        itemsPerPage: limit,
        totalItems,
        currentPage: page,
        totalPages,
      },
      links,
    };
  }

  // ==================== FIND ONE TICKET ====================
  async findOne(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        filedByUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedToUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        department: true,
        category: true,
        asset: true,
        comments: {
          include: {
            authorUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          where: { commentId: null }, // Ticket-level attachments only
        },
        statusHistory: {
          include: {
            changedByUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    // Check permissions
    const canView = this.canViewTicket(user, ticket);
    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to view this ticket',
      );
    }

    // Record view audit log (async, non-blocking)
    void this.auditLogsService.record({
      actorUserId: userId,
      action: AuditAction.View,
      entityType: AuditEntityType.Ticket,
      entityId: id,
    });

    return ticket;
  }

  // ==================== UPDATE TICKET ====================
  async update(id: string, userId: string, updateTicketDto: UpdateTicketDto) {
    // 1. Get existing ticket
    const existingTicket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        filedByUser: true,
      },
    });

    if (!existingTicket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    // 2. Check permissions
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const canUpdate = this.canUpdateTicket(user, existingTicket);
    if (!canUpdate) {
      throw new ForbiddenException(
        'You do not have permission to update this ticket',
      );
    }

    // 3. Prepare update data
    const { accept, createKnownIssue, departmentId, ...restUpdateDto } =
      updateTicketDto;

    if (departmentId === null) {
      throw new BadRequestException('Department cannot be cleared');
    }

    const updateData: Prisma.TicketUncheckedUpdateInput = { ...restUpdateDto };

    if (departmentId !== undefined) {
      updateData.departmentId = departmentId;
    }

    const isAccepting = accept === true;

    const isAssigning =
      restUpdateDto.assignedToUserId !== undefined || isAccepting;
    let assignedToUserForNotification: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      role: UserRole;
    } | null = null;

    if (createKnownIssue && restUpdateDto.knownIssueId) {
      throw new BadRequestException(
        'Provide either knownIssueId or createKnownIssue, not both',
      );
    }

    if (createKnownIssue) {
      if (user.role !== UserRole.Admin && user.role !== UserRole.ItStaff) {
        throw new ForbiddenException(
          'Only admins and IT staff can create known issues',
        );
      }

      const knownIssue = await this.prisma.knownIssue.create({
        data: {
          title: createKnownIssue.title,
          description: createKnownIssue.description,
          status: createKnownIssue.status ?? KnownIssueStatus.Active,
          createdByUserId: userId,
        },
      });

      updateData.knownIssueId = knownIssue.id;
    }

    if (isAccepting) {
      if (user.role !== UserRole.ItStaff) {
        throw new ForbiddenException('Only IT staff can accept tickets');
      }

      this.ensureTicketAssignable(existingTicket);

      if (
        existingTicket.assignedToUserId &&
        existingTicket.assignedToUserId !== user.id
      ) {
        throw new BadRequestException(
          'Ticket is already assigned to another staff member',
        );
      }

      if (
        restUpdateDto.assignedToUserId !== undefined &&
        restUpdateDto.assignedToUserId !== user.id
      ) {
        throw new BadRequestException(
          'Accepting a ticket assigns it to the current user',
        );
      }

      const normalizedAcceptStatus = this.normalizeTicketStatus(
        restUpdateDto.status,
      );

      if (
        normalizedAcceptStatus &&
        normalizedAcceptStatus !== TicketStatus.Acknowledged
      ) {
        throw new BadRequestException(
          'Accepting a ticket sets status to acknowledged',
        );
      }

      updateData.assignedToUserId = user.id;
      updateData.status = TicketStatus.Acknowledged;
    }

    const assignedToUserIdCandidate =
      restUpdateDto.assignedToUserId ?? (isAccepting ? user.id : undefined);

    if (isAssigning) {
      this.ensureTicketAssignable(existingTicket);

      if (user.role !== UserRole.Admin && user.role !== UserRole.ItStaff) {
        throw new ForbiddenException(
          'Only admins and IT staff can assign tickets',
        );
      }

      if (assignedToUserIdCandidate) {
        if (
          user.role === UserRole.Admin &&
          assignedToUserIdCandidate === user.id
        ) {
          throw new ForbiddenException('Admins cannot self-assign tickets');
        }

        if (
          user.role === UserRole.ItStaff &&
          assignedToUserIdCandidate !== user.id
        ) {
          throw new ForbiddenException('IT staff can only self-assign tickets');
        }

        if (assignedToUserIdCandidate === user.id) {
          assignedToUserForNotification = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          };
        } else {
          assignedToUserForNotification = await this.prisma.user.findUnique({
            where: { id: assignedToUserIdCandidate },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          });

          if (!assignedToUserForNotification) {
            throw new NotFoundException(
              `User ${assignedToUserIdCandidate} not found`,
            );
          }
        }

        if (assignedToUserForNotification.role !== UserRole.ItStaff) {
          throw new BadRequestException(
            'Tickets can only be assigned to IT staff',
          );
        }
      } else if (assignedToUserIdCandidate === null) {
        if (
          user.role === UserRole.ItStaff &&
          existingTicket.assignedToUserId !== user.id
        ) {
          throw new ForbiddenException('IT staff can only unassign themselves');
        }
      }
    }

    if (
      user.role === UserRole.Admin &&
      !isAccepting &&
      assignedToUserIdCandidate &&
      existingTicket.status === TicketStatus.Open &&
      restUpdateDto.status === undefined
    ) {
      updateData.status = TicketStatus.Acknowledged;
    }

    // 4. Handle status change
    let statusChanged = false;
    const oldStatus = existingTicket.status;
    const newStatus = this.normalizeTicketStatus(updateData.status as string);

    if (updateTicketDto.status && !newStatus) {
      throw new BadRequestException('Invalid status value');
    }

    if (newStatus) {
      updateData.status = newStatus;
    }

    if (newStatus && newStatus !== oldStatus) {
      statusChanged = true;

      // Validate status transition
      this.validateStatusTransition(oldStatus, newStatus, user.role);

      // Handle SLA pause/resume for pending_user
      if (
        newStatus === TicketStatus.PendingUser &&
        !existingTicket.slaPausedAt
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        updateData.slaPausedAt = new Date();
      } else if (
        oldStatus === TicketStatus.PendingUser &&
        newStatus !== TicketStatus.PendingUser
      ) {
        // Calculate paused duration
        const pausedMinutes = this.slaService.calculatePausedDuration(
          existingTicket.slaPausedAt!,
        );
        const newTotalPaused =
          existingTicket.totalPausedMinutes + pausedMinutes;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        updateData.totalPausedMinutes = newTotalPaused;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        updateData.slaPausedAt = null;

        // Recalculate deadlines using the ticket's snapshot minutes
        const snapshotMinutes = await this.slaService.resolveSnapshotMinutes(
          existingTicket.priority,
          existingTicket.slaAckMinutes,
          existingTicket.slaResolutionMinutes,
        );

        const deadlines = this.slaService.calculateDeadlinesFromMinutes(
          existingTicket.createdAt,
          snapshotMinutes.acknowledgementMinutes,
          snapshotMinutes.resolutionMinutes,
          newTotalPaused,
        );

        if (existingTicket.slaAckMinutes == null) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          updateData.slaAckMinutes = snapshotMinutes.acknowledgementMinutes;
        }
        if (existingTicket.slaResolutionMinutes == null) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          updateData.slaResolutionMinutes = snapshotMinutes.resolutionMinutes;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        updateData.slaAckDeadline = deadlines.ack;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        updateData.slaResolutionDeadline = deadlines.resolution;
      }

      // Set timestamps based on status
      if (
        newStatus === TicketStatus.Acknowledged &&
        !existingTicket.acknowledgedAt
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        updateData.acknowledgedAt = new Date();
        // FIX 1: REMOVED the line that sets slaAckBreached
        // Do NOT set slaAckBreached here - let updateBreachStatus handle it
      }
      if (newStatus === TicketStatus.Resolved && !existingTicket.resolvedAt) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        updateData.resolvedAt = new Date();
      }
      if (newStatus === TicketStatus.Closed && !existingTicket.closedAt) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        updateData.closedAt = new Date();
      }
    }

    // 5. Handle asset validation if being updated
    if (
      updateTicketDto.assetId !== undefined &&
      updateTicketDto.assetId !== null
    ) {
      const asset = await this.prisma.asset.findUnique({
        where: { id: updateTicketDto.assetId },
      });
      if (!asset) {
        throw new BadRequestException('Asset not found');
      }
    }

    // 6. Handle category validation if being updated
    if (updateTicketDto.categoryId) {
      const category = await this.prisma.ticketCategory.findFirst({
        where: {
          id: updateTicketDto.categoryId,
          isActive: true,
          deletedAt: null,
        },
      });
      if (!category) {
        throw new BadRequestException('Invalid or inactive ticket category');
      }
    }

    // 7. Handle department change (IT/Admin only)
    if (updateTicketDto.departmentId && user.role !== UserRole.Employee) {
      const department = await this.prisma.department.findUnique({
        where: { id: updateTicketDto.departmentId },
      });
      if (!department) {
        throw new BadRequestException('Department not found');
      }
    } else if (
      updateTicketDto.departmentId &&
      user.role === UserRole.Employee
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete updateData.departmentId;
    }

    // 8. Update ticket
    const updatedTicket = await this.prisma.ticket.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: updateData,
      include: {
        filedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedToUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        department: true,
        category: true,
        asset: true,
      },
    });

    // 9. Record status history if changed
    if (statusChanged) {
      await this.recordStatusHistory(id, oldStatus, newStatus!, userId);

      // Notify creator about status change (async, non-blocking)
      const creatorName =
        [
          existingTicket.filedByUser.firstName,
          existingTicket.filedByUser.lastName,
        ]
          .filter(Boolean)
          .join(' ') || existingTicket.filedByUser.email;

      const notificationsService = this.notificationsService as {
        notifyStatusChanged: (
          ticketId: string,
          ticketTitle: string,
          creatorId: string,
          creatorName: string,
          oldStatus: string,
          newStatus: string,
        ) => Promise<void>;
      };

      void notificationsService.notifyStatusChanged(
        id,
        existingTicket.title,
        existingTicket.filedByUserId,
        creatorName,
        oldStatus,
        newStatus!,
      );
    }

    if (
      isAssigning &&
      assignedToUserForNotification &&
      assignedToUserForNotification.id !== existingTicket.assignedToUserId
    ) {
      const assigneeName =
        [
          assignedToUserForNotification.firstName,
          assignedToUserForNotification.lastName,
        ]
          .filter(Boolean)
          .join(' ') || assignedToUserForNotification.email;

      const notificationsService = this.notificationsService as {
        notifyTicketAssigned: (
          ticketId: string,
          ticketTitle: string,
          assigneeId: string,
          assigneeName: string,
        ) => Promise<void>;
      };

      void notificationsService.notifyTicketAssigned(
        id,
        existingTicket.title,
        assignedToUserForNotification.id,
        assigneeName,
      );
    }

    // 10. Record audit log for update (async, non-blocking)
    void this.auditLogsService.record({
      actorUserId: userId,
      action: AuditAction.Update,
      entityType: AuditEntityType.Ticket,
      entityId: id,
      metadata: {
        changes: {
          ...(statusChanged ? { fromStatus: oldStatus, toStatus: newStatus } : {}),
          ...(isAssigning && assignedToUserForNotification
            ? { assignedToUserId: assignedToUserForNotification.id }
            : {}),
        },
      },
    });

    // 11. Check for SLA breaches after update
    await this.slaService.updateBreachStatus(id);

    return updatedTicket;
  }

  // ==================== DELETE TICKET (Soft delete) ====================
  async remove(id: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (
      !user ||
      (user.role !== UserRole.Admin && user.role !== UserRole.ItStaff)
    ) {
      throw new ForbiddenException(
        'Only admins and IT staff can delete tickets',
      );
    }

    // Soft delete by marking as closed
    const result = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.Closed,
        closedAt: new Date(),
      },
    });

    // Record audit log (async, non-blocking)
    void this.auditLogsService.record({
      actorUserId: userId,
      action: AuditAction.Delete,
      entityType: AuditEntityType.Ticket,
      entityId: id,
      metadata: {
        closed: true,
        previousStatus: ticket.status,
      },
    });

    return result;
  }

  // ==================== ASSIGN TICKET ====================
  async assignTicket(
    id: string,
    assignedToUserId: string,
    actorUserId: string,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    this.ensureTicketAssignable(ticket);

    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
    });

    if (!actor) {
      throw new NotFoundException('User not found');
    }

    if (actor.role !== UserRole.Admin && actor.role !== UserRole.ItStaff) {
      throw new ForbiddenException(
        'Only admins and IT staff can assign tickets',
      );
    }

    if (actor.role === UserRole.Admin && actor.id === assignedToUserId) {
      throw new ForbiddenException('Admins cannot self-assign tickets');
    }

    if (actor.role === UserRole.ItStaff && actor.id !== assignedToUserId) {
      throw new ForbiddenException('IT staff can only self-assign tickets');
    }

    const assignedToUser = await this.prisma.user.findUnique({
      where: { id: assignedToUserId },
    });

    if (!assignedToUser) {
      throw new NotFoundException(`User ${assignedToUserId} not found`);
    }

    if (assignedToUser.role !== UserRole.ItStaff) {
      throw new BadRequestException('Tickets can only be assigned to IT staff');
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id },
      data: { assignedToUserId },
      include: {
        assignedToUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Notify assignee about the assignment (async, non-blocking)
    const assigneeName =
      [assignedToUser.firstName, assignedToUser.lastName]
        .filter(Boolean)
        .join(' ') || assignedToUser.email;

    const notificationsService = this.notificationsService as {
      notifyTicketAssigned: (
        ticketId: string,
        ticketTitle: string,
        assigneeId: string,
        assigneeName: string,
      ) => Promise<void>;
    };

    // Fire and forget - don't await to avoid blocking response
    void notificationsService.notifyTicketAssigned(
      ticket.id,
      ticket.title,
      assignedToUserId,
      assigneeName,
    );

    // Record audit log (async, non-blocking)
    void this.auditLogsService.record({
      actorUserId: actorUserId,
      action: AuditAction.Assign,
      entityType: AuditEntityType.Ticket,
      entityId: id,
      metadata: {
        assignedToUserId,
        assignedToUserEmail: assignedToUser.email,
      },
    });

    return updatedTicket;
  }

  // ==================== UNASSIGN TICKET ====================
  async unassignTicket(id: string, actorUserId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    if (ticket.status === TicketStatus.Closed) {
      throw new BadRequestException('Closed tickets cannot be unassigned');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
    });

    if (!actor) {
      throw new NotFoundException('User not found');
    }

    if (actor.role !== UserRole.Admin && actor.role !== UserRole.ItStaff) {
      throw new ForbiddenException(
        'Only admins and IT staff can unassign tickets',
      );
    }

    if (
      actor.role === UserRole.ItStaff &&
      ticket.assignedToUserId !== actor.id
    ) {
      throw new ForbiddenException('IT staff can only unassign themselves');
    }

    const result = await this.prisma.ticket.update({
      where: { id },
      data: { assignedToUserId: null },
    });

    // Record audit log (async, non-blocking)
    void this.auditLogsService.record({
      actorUserId: actorUserId,
      action: AuditAction.Unassign,
      entityType: AuditEntityType.Ticket,
      entityId: id,
      metadata: {
        previouslyAssignedToUserId: ticket.assignedToUserId,
      },
    });

    return result;
  }

  // ==================== BULK ASSIGN ====================
  async bulkAssign(
    ticketIds: string[],
    assignToUserId: string,
    actorUserId: string,
  ) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
    });

    if (!actor) {
      throw new NotFoundException('User not found');
    }

    if (actor.role !== UserRole.Admin && actor.role !== UserRole.ItStaff) {
      throw new ForbiddenException(
        'Only admins and IT staff can assign tickets',
      );
    }

    const assignedToUser = await this.prisma.user.findUnique({
      where: { id: assignToUserId },
    });

    if (!assignedToUser) {
      throw new NotFoundException(`User ${assignToUserId} not found`);
    }

    if (assignedToUser.role !== UserRole.ItStaff) {
      throw new BadRequestException('Tickets can only be assigned to IT staff');
    }

    if (actor.role === UserRole.Admin && actor.id === assignToUserId) {
      throw new ForbiddenException('Admins cannot self-assign tickets');
    }

    if (actor.role === UserRole.ItStaff && actor.id !== assignToUserId) {
      throw new ForbiddenException('IT staff can only self-assign tickets');
    }

    const tickets = await this.prisma.ticket.findMany({
      where: {
        id: { in: ticketIds },
        status: { not: TicketStatus.Closed },
      },
    });

    if (tickets.length === 0) {
      throw new BadRequestException('No eligible tickets found for assignment');
    }

    const skipped = ticketIds.length - tickets.length;

    await this.prisma.ticket.updateMany({
      where: { id: { in: tickets.map((t) => t.id) } },
      data: { assignedToUserId: assignToUserId },
    });

    // Record audit logs for each assigned ticket (async, non-blocking)
    for (const ticket of tickets) {
      void this.auditLogsService.record({
        actorUserId: actorUserId,
        action: AuditAction.Assign,
        entityType: AuditEntityType.Ticket,
        entityId: ticket.id,
        metadata: {
          assignToUserId,
          bulkOperation: true,
        },
      });
    }

    return {
      message: `Bulk assignment completed. ${tickets.length} ticket(s) assigned.${skipped > 0 ? ` ${skipped} ticket(s) skipped (closed).` : ''}`,
      assignedCount: tickets.length,
      skippedCount: skipped,
    };
  }

  // ==================== BULK STATUS ====================
  async bulkStatus(
    ticketIds: string[],
    status: TicketStatus,
    actorUserId: string,
  ) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
    });

    if (!actor) {
      throw new NotFoundException('User not found');
    }

    if (actor.role !== UserRole.Admin && actor.role !== UserRole.ItStaff) {
      throw new ForbiddenException(
        'Only admins and IT staff can update ticket statuses in bulk',
      );
    }

    const tickets = await this.prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
    });

    if (tickets.length === 0) {
      throw new BadRequestException('No tickets found');
    }

    let updatedCount = 0;
    const errors: Array<{ ticketId: string; error: string }> = [];

    for (const ticket of tickets) {
      try {
        this.validateStatusTransition(ticket.status, status, actor.role);

        const updateData: Prisma.TicketUncheckedUpdateInput = {
          status,
        };

        if (status === TicketStatus.Acknowledged && !ticket.acknowledgedAt) {
          updateData.acknowledgedAt = new Date();
        }
        if (status === TicketStatus.Resolved && !ticket.resolvedAt) {
          updateData.resolvedAt = new Date();
        }
        if (status === TicketStatus.Closed && !ticket.closedAt) {
          updateData.closedAt = new Date();
        }

        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: updateData as Prisma.TicketUpdateInput,
        });

        await this.recordStatusHistory(
          ticket.id,
          ticket.status,
          status,
          actorUserId,
        );

        // Record audit log for status change (async, non-blocking)
        void this.auditLogsService.record({
          actorUserId: actorUserId,
          action: AuditAction.Update,
          entityType: AuditEntityType.Ticket,
          entityId: ticket.id,
          metadata: {
            changes: {
              fromStatus: ticket.status,
              toStatus: status,
            },
            bulkOperation: true,
          },
        });

        updatedCount++;
      } catch (error) {
        errors.push({
          ticketId: ticket.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      message: `Status updated for ${updatedCount} of ${ticketIds.length} ticket(s)`,
      updatedCount,
      totalRequested: ticketIds.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // ==================== INLINE FILE ATTACHMENT ====================
  async attachFile(
    ticketId: string,
    userId: string,
    file: MulterFile,
  ) {
    // Verify ticket exists and user has permission
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.DepartmentHead) {
      throw new ForbiddenException('Department heads cannot upload attachments');
    }

    // Generate unique filename and save file to storage
    const filePath = await this.storage.save(file, ticketId);

    // Create attachment record with the real storage path
    const attachment = await this.prisma.ticketAttachment.create({
      data: {
        ticketId,
        uploadedByUserId: userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSizeBytes: file.size,
        fileUrlOrPath: filePath,
      },
    });

    // Record audit log (async, non-blocking)
    void this.auditLogsService.record({
      actorUserId: userId,
      action: AuditAction.Upload,
      entityType: AuditEntityType.Attachment,
      entityId: attachment.id,
      metadata: {
        ticketId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSizeBytes: file.size,
      },
    });

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSizeBytes: attachment.fileSizeBytes,
      ticketId: attachment.ticketId,
      message: 'File attached successfully',
    };
  }

  // ==================== BULK ATTACH TO KNOWN ISSUE ====================
  async bulkAttachToKnownIssue(ticketIds: string[], knownIssueId: string) {
    const knownIssue = await this.prisma.knownIssue.findFirst({
      where: {
        id: knownIssueId,
        status: KnownIssueStatus.Active,
        deletedAt: null,
      },
    });

    if (!knownIssue) {
      throw new BadRequestException('Known issue not found or not active');
    }

    return this.prisma.ticket.updateMany({
      where: { id: { in: ticketIds } },
      data: { knownIssueId },
    });
  }

  // ==================== BULK RESOLVE FOR KNOWN ISSUE ====================
  async resolveTicketsForKnownIssue(knownIssueId: string, actorUserId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        knownIssueId,
        status: {
          notIn: [TicketStatus.Resolved, TicketStatus.Closed],
        },
      },
      select: {
        id: true,
        status: true,
        acknowledgedAt: true,
        resolvedAt: true,
        createdAt: true,
        priority: true,
        slaAckMinutes: true,
        slaResolutionMinutes: true,
        slaPausedAt: true,
        totalPausedMinutes: true,
      },
    });

    if (tickets.length === 0) {
      return { updatedCount: 0 };
    }

    const now = new Date();

    for (const ticket of tickets) {
      const transitions = this.buildAutoResolveTransitions(ticket.status);
      if (transitions.length === 0) {
        continue;
      }

      await this.prisma.$transaction(async (tx) => {
        const updateData: Prisma.TicketUpdateInput = {
          status: TicketStatus.Resolved,
          resolvedAt: ticket.resolvedAt ?? now,
        };

        if (
          this.shouldSetAcknowledgedAt(ticket.status, ticket.acknowledgedAt)
        ) {
          updateData.acknowledgedAt = now;
        }

        await this.applySlaResumeForPendingUser(ticket, updateData);

        await tx.ticket.update({
          where: { id: ticket.id },
          data: updateData,
        });

        for (const transition of transitions) {
          await tx.ticketStatusHistory.create({
            data: {
              ticketId: ticket.id,
              fromStatus: transition.from,
              toStatus: transition.to,
              changedByUserId: actorUserId,
            },
          });
        }
      });
    }

    return { updatedCount: tickets.length };
  }

  // ==================== COMMENT METHODS (Proxy to CommentsModule) ====================
  // These methods are kept for backward compatibility
  // They delegate to the CommentsService but are maintained here for existing code

  async addComment(
    ticketId: string,
    userId: string,
    createCommentDto: CreateTicketCommentDto,
  ) {
    return this.commentsService.create(userId, {
      ticketId,
      body: createCommentDto.body,
      isInternal: createCommentDto.isInternal,
    });
  }

  async getComments(ticketId: string, userId: string) {
    return this.commentsService.findAll(ticketId, userId);
  }

  async updateComment(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateTicketCommentDto,
  ) {
    return this.commentsService.update(commentId, userId, updateCommentDto);
  }

  async deleteComment(commentId: string, userId: string) {
    return this.commentsService.remove(commentId, userId);
  }

  // ==================== HELPER METHODS ====================

  private async recordStatusHistory(
    ticketId: string,
    fromStatus: TicketStatus | null,
    toStatus: TicketStatus,
    changedByUserId: string,
  ) {
    return this.prisma.ticketStatusHistory.create({
      data: {
        ticketId,
        fromStatus,
        toStatus,
        changedByUserId,
      },
    });
  }

  private buildAutoResolveTransitions(
    currentStatus: TicketStatus,
  ): Array<{ from: TicketStatus; to: TicketStatus }> {
    switch (currentStatus) {
      case TicketStatus.Open:
        return [
          { from: TicketStatus.Open, to: TicketStatus.Acknowledged },
          {
            from: TicketStatus.Acknowledged,
            to: TicketStatus.InProgress,
          },
          { from: TicketStatus.InProgress, to: TicketStatus.Resolved },
        ];
      case TicketStatus.Acknowledged:
        return [
          {
            from: TicketStatus.Acknowledged,
            to: TicketStatus.InProgress,
          },
          { from: TicketStatus.InProgress, to: TicketStatus.Resolved },
        ];
      case TicketStatus.PendingUser:
        return [
          { from: TicketStatus.PendingUser, to: TicketStatus.InProgress },
          { from: TicketStatus.InProgress, to: TicketStatus.Resolved },
        ];
      case TicketStatus.InProgress:
        return [{ from: TicketStatus.InProgress, to: TicketStatus.Resolved }];
      default:
        return [];
    }
  }

  private shouldSetAcknowledgedAt(
    status: TicketStatus,
    acknowledgedAt: Date | null,
  ) {
    if (acknowledgedAt) {
      return false;
    }

    return status === TicketStatus.Open || status === TicketStatus.Acknowledged;
  }

  private async applySlaResumeForPendingUser(
    ticket: {
      status: TicketStatus;
      slaPausedAt: Date | null;
      totalPausedMinutes: number;
      createdAt: Date;
      priority: PriorityLevel;
      slaAckMinutes: number | null;
      slaResolutionMinutes: number | null;
    },
    updateData: Prisma.TicketUpdateInput,
  ) {
    if (ticket.status !== TicketStatus.PendingUser || !ticket.slaPausedAt) {
      return;
    }

    const pausedMinutes = this.slaService.calculatePausedDuration(
      ticket.slaPausedAt,
    );
    const newTotalPaused = ticket.totalPausedMinutes + pausedMinutes;

    updateData.totalPausedMinutes = newTotalPaused;
    updateData.slaPausedAt = null;

    const snapshotMinutes = await this.slaService.resolveSnapshotMinutes(
      ticket.priority,
      ticket.slaAckMinutes,
      ticket.slaResolutionMinutes,
    );

    const deadlines = this.slaService.calculateDeadlinesFromMinutes(
      ticket.createdAt,
      snapshotMinutes.acknowledgementMinutes,
      snapshotMinutes.resolutionMinutes,
      newTotalPaused,
    );

    if (ticket.slaAckMinutes == null) {
      updateData.slaAckMinutes = snapshotMinutes.acknowledgementMinutes;
    }
    if (ticket.slaResolutionMinutes == null) {
      updateData.slaResolutionMinutes = snapshotMinutes.resolutionMinutes;
    }

    updateData.slaAckDeadline = deadlines.ack;
    updateData.slaResolutionDeadline = deadlines.resolution;
  }
  private validateStatusTransition(
    from: TicketStatus,
    to: TicketStatus,
    userRole: UserRole,
  ) {
    const allowedTransitions: Record<TicketStatus, TicketStatus[]> = {
      [TicketStatus.Open]: [TicketStatus.Acknowledged, TicketStatus.Closed],
      [TicketStatus.Acknowledged]: [
        TicketStatus.PendingUser,
        TicketStatus.InProgress,
        TicketStatus.Resolved,
        TicketStatus.Closed,
      ],
      [TicketStatus.PendingUser]: [
        TicketStatus.InProgress,
        TicketStatus.Resolved,
        TicketStatus.Closed,
      ],
      [TicketStatus.InProgress]: [TicketStatus.Resolved, TicketStatus.Closed],
      [TicketStatus.Resolved]: [TicketStatus.Closed, TicketStatus.Open],
      [TicketStatus.Closed]: [],
    };

    const allowed = allowedTransitions[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Invalid status transition from ${from} to ${to}`,
      );
    }

    // Only admins can reopen resolved tickets
    if (
      from === TicketStatus.Resolved &&
      to === TicketStatus.Open &&
      userRole !== UserRole.Admin
    ) {
      throw new ForbiddenException('Only admins can reopen resolved tickets');
    }
  }

  private normalizeTicketStatus(
    status?: TicketStatus | string | null,
  ): TicketStatus | undefined {
    if (!status) {
      return undefined;
    }

    if (Object.values(TicketStatus).includes(status as TicketStatus)) {
      return status as TicketStatus;
    }

    const normalized = status.toString().trim().toLowerCase();
    const mapped: Record<string, TicketStatus> = {
      open: TicketStatus.Open,
      acknowledged: TicketStatus.Acknowledged,
      pending_user: TicketStatus.PendingUser,
      in_progress: TicketStatus.InProgress,
      resolved: TicketStatus.Resolved,
      closed: TicketStatus.Closed,
    };

    return mapped[normalized];
  }

  private canViewTicket(
    user: TicketActor,
    ticket: { departmentId: string; filedByUserId: string },
  ): boolean {
    switch (user.role) {
      case UserRole.Admin:
        return true;
      case UserRole.ItStaff:
        return true;
      case UserRole.DepartmentHead:
        return user.departmentId === ticket.departmentId;
      case UserRole.Employee:
        return user.id === ticket.filedByUserId;
      default:
        return false;
    }
  }

  private canUpdateTicket(
    user: TicketActor,
    ticket: { departmentId: string; filedByUserId: string },
  ): boolean {
    switch (user.role) {
      case UserRole.Admin:
        return true;
      case UserRole.ItStaff:
        return true;
      case UserRole.DepartmentHead:
        return false;
      case UserRole.Employee:
        return user.id === ticket.filedByUserId;
      default:
        return false;
    }
  }

  private ensureTicketAssignable(ticket: { status: TicketStatus }) {
    if (ticket.status === TicketStatus.Closed) {
      throw new BadRequestException('Closed tickets cannot be assigned');
    }
  }

  private parsePositiveNumber(value: unknown, fallback: number): number {
    if (value == null) return fallback;
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
  }

  private buildPageLinks(
    filters: TicketListQuery | undefined,
    page: number,
    totalPages: number,
    limit: number,
  ) {
    const buildUrl = (targetPage: number) => {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(limit));

      if (filters?.status) params.set('status', String(filters.status));
      if (filters?.priority) params.set('priority', String(filters.priority));
      if (filters?.assignedToUserId)
        params.set('assignedToUserId', String(filters.assignedToUserId));
      if (filters?.departmentId)
        params.set('departmentId', String(filters.departmentId));
      if (filters?.categoryId)
        params.set('categoryId', String(filters.categoryId));
      if (filters?.search) params.set('search', String(filters.search));

      this.normalizeSortBy(filters?.sortBy).forEach((entry) => {
        const [field, direction] = Object.entries(entry)[0] ?? [];
        if (field && direction) {
          params.append('sortBy', `${field}:${direction}`);
        }
      });

      return `/tickets?${params.toString()}`;
    };

    const first = buildUrl(1);
    const last = buildUrl(totalPages);
    const previous = page > 1 ? buildUrl(page - 1) : undefined;
    const next = page < totalPages ? buildUrl(page + 1) : undefined;

    return {
      first,
      previous,
      next,
      last,
    };
  }

  private normalizeSortBy(value?: string[] | string) {
    const raw = Array.isArray(value) ? value : value ? [value] : [];
    const allowed = new Set([
      'createdAt',
      'priority',
      'status',
      'slaAckDeadline',
      'slaResolutionDeadline',
    ]);

    return raw
      .map((entry) => {
        const [field, direction] = entry.split(':');
        if (!field || !allowed.has(field)) return null;
        const normalizedDirection =
          direction?.toLowerCase() === 'asc' ? 'asc' : 'desc';
        return { [field]: normalizedDirection } as Record<
          string,
          'asc' | 'desc'
        >;
      })
      .filter((entry): entry is Record<string, 'asc' | 'desc'> => !!entry);
  }
}
