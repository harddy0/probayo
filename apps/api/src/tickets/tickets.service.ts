import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
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
} from '@prisma/client';
import { CommentsService } from '../comments/comments.service';
import { NotificationsService } from '../notifications/notifications.service';

type TicketActor = {
  id: string;
  role: UserRole;
  departmentId?: string | null;
};

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private slaService: SlaService,
    private notificationsService: NotificationsService,
    private commentsService: CommentsService,
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

    return ticket;
  }

  // ==================== FIND ALL TICKETS (Role-based) ====================
  async findAll(userId: string, filters?: Prisma.TicketWhereInput) {
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

    return this.prisma.ticket.findMany({
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
      orderBy: [
        { priority: 'desc' }, // critical first
        { slaAckDeadline: 'asc' }, // soonest deadlines first
      ],
    });
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

    // 10. Check for SLA breaches after update
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
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.Closed,
        closedAt: new Date(),
      },
    });
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

    return this.prisma.ticket.update({
      where: { id },
      data: { assignedToUserId: null },
    });
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
        return user.departmentId === ticket.departmentId;
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
}
