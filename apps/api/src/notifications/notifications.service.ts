// src/notifications/notifications.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  NotificationType,
  NotificationChannel,
  UserRole,
} from '@prisma/client';
import {
  JOB_NAMES,
  QUEUE_NAMES,
  RETRY_CONFIG,
} from '../queues/constants/queue.constants';

export interface TicketCreatedNotificationJobData {
  ticketId: string;
  ticketTitle: string;
  filedByName: string;
  departmentName: string;
  priority: string;
}

export interface TicketAssignedNotificationJobData {
  ticketId: string;
  ticketTitle: string;
  assigneeId: string;
  assigneeName: string;
}

export interface StatusChangedNotificationJobData {
  ticketId: string;
  ticketTitle: string;
  creatorId: string;
  creatorName: string;
  oldStatus: string;
  newStatus: string;
}

export interface CommentAddedNotificationJobData {
  ticketId: string;
  ticketTitle: string;
  commentAuthorId: string;
  commentAuthorName: string;
  commentBody: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        recipientUserId: createNotificationDto.recipientUserId,
        ticketId: createNotificationDto.ticketId,
        type: createNotificationDto.type,
        channel: createNotificationDto.channel,
        subject: createNotificationDto.subject,
        body: createNotificationDto.body,
      },
      include: {
        recipientUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        ticket: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        recipientUserId: userId,
      },
      include: {
        recipientUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        ticket: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        recipientUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        ticket: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    if (notification.recipientUserId !== userId) {
      throw new ForbiddenException('You can only view your own notifications');
    }

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    if (notification.recipientUserId !== userId) {
      throw new ForbiddenException(
        'You can only mark your own notifications as read',
      );
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        sentAt: new Date(),
      },
      include: {
        recipientUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        ticket: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        recipientUserId: userId,
        sentAt: null,
      },
    });
  }

  async findITStaff(): Promise<
    Array<{
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    }>
  > {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.ItStaff, UserRole.Admin],
        },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  async createTicketCreatedNotifications(
    ticketId: string,
    ticketTitle: string,
    filedByName: string,
    departmentName: string,
    priority: string,
  ): Promise<void> {
    try {
      const itStaff = await this.findITStaff();

      if (itStaff.length === 0) {
        this.logger.warn('No IT staff found for ticket creation notification');
        return;
      }

      const subject = `New Ticket Created: ${ticketTitle.substring(0, 50)}`;
      const body = `A new ticket has been created by ${filedByName} from ${departmentName} department.\n\nTitle: ${ticketTitle}\nPriority: ${priority}\n\nPlease log in to the helpdesk system to review and acknowledge this ticket.`;

      await Promise.all(
        itStaff.map((staff) =>
          this.create({
            recipientUserId: staff.id,
            ticketId,
            type: NotificationType.TicketCreated,
            channel: NotificationChannel.InApp,
            subject,
            body,
          }),
        ),
      );

      this.logger.log(
        `Ticket creation notifications sent to ${itStaff.length} IT staff members for ticket ${ticketId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create ticket creation notifications for ticket ${ticketId}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw - notification failure shouldn't block ticket creation
    }
  }

  async notifyTicketCreated(
    ticketId: string,
    ticketTitle: string,
    filedByName: string,
    departmentName: string,
    priority: string,
  ): Promise<void> {
    try {
      const payload: TicketCreatedNotificationJobData = {
        ticketId,
        ticketTitle,
        filedByName,
        departmentName,
        priority,
      };

      await this.notificationsQueue.add(
        JOB_NAMES.SEND_TICKET_CREATED_NOTIFICATION,
        payload,
        {
          attempts: RETRY_CONFIG.ATTEMPTS,
          backoff: {
            type: RETRY_CONFIG.BACKOFF_TYPE,
            delay: RETRY_CONFIG.BACKOFF_DELAY,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(
        `Queued ticket creation notifications for ticket ${ticketId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue ticket creation notifications for ticket ${ticketId}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw - notification failure shouldn't block ticket creation
    }
  }

  async createTicketAssignedNotifications(
    ticketId: string,
    ticketTitle: string,
    assigneeId: string,
    assigneeName: string,
  ): Promise<void> {
    try {
      const subject = `Ticket Assigned: ${ticketTitle.substring(0, 50)}`;
      const body = `You have been assigned to ticket: ${ticketTitle}\n\nPlease review and acknowledge the ticket in the helpdesk system.`;

      await this.create({
        recipientUserId: assigneeId,
        ticketId,
        type: NotificationType.Assignment,
        channel: NotificationChannel.InApp,
        subject,
        body,
      });

      this.logger.log(
        `Ticket assignment notification sent to ${assigneeName} for ticket ${ticketId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create ticket assignment notification for ticket ${ticketId}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw - notification failure shouldn't block assignment
    }
  }

  async notifyTicketAssigned(
    ticketId: string,
    ticketTitle: string,
    assigneeId: string,
    assigneeName: string,
  ): Promise<void> {
    try {
      const payload: TicketAssignedNotificationJobData = {
        ticketId,
        ticketTitle,
        assigneeId,
        assigneeName,
      };

      await this.notificationsQueue.add(
        JOB_NAMES.SEND_TICKET_ASSIGNED_NOTIFICATION,
        payload,
        {
          attempts: RETRY_CONFIG.ATTEMPTS,
          backoff: {
            type: RETRY_CONFIG.BACKOFF_TYPE,
            delay: RETRY_CONFIG.BACKOFF_DELAY,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(
        `Queued ticket assignment notifications for ticket ${ticketId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue ticket assignment notifications for ticket ${ticketId}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw - notification failure shouldn't block ticket assignment
    }
  }

  async createStatusChangedNotifications(
    ticketId: string,
    ticketTitle: string,
    creatorId: string,
    creatorName: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    try {
      const subject = `Ticket Status Updated: ${ticketTitle.substring(0, 50)}`;
      const body = `Your ticket status has been updated from ${oldStatus} to ${newStatus}.\n\nPlease log in to view the details.`;

      await this.create({
        recipientUserId: creatorId,
        ticketId,
        type: NotificationType.StatusChanged,
        channel: NotificationChannel.InApp,
        subject,
        body,
      });

      this.logger.log(
        `Status changed notification sent to ${creatorName} for ticket ${ticketId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create status changed notification for ticket ${ticketId}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw - notification failure shouldn't block status change
    }
  }

  async notifyStatusChanged(
    ticketId: string,
    ticketTitle: string,
    creatorId: string,
    creatorName: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    try {
      const payload: StatusChangedNotificationJobData = {
        ticketId,
        ticketTitle,
        creatorId,
        creatorName,
        oldStatus,
        newStatus,
      };

      await this.notificationsQueue.add(
        JOB_NAMES.SEND_STATUS_CHANGED_NOTIFICATION,
        payload,
        {
          attempts: RETRY_CONFIG.ATTEMPTS,
          backoff: {
            type: RETRY_CONFIG.BACKOFF_TYPE,
            delay: RETRY_CONFIG.BACKOFF_DELAY,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(
        `Queued status changed notifications for ticket ${ticketId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue status changed notifications for ticket ${ticketId}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw - notification failure shouldn't block status change
    }
  }

  async createCommentAddedNotifications(
    ticketId: string,
    ticketTitle: string,
    commentAuthorId: string,
    commentAuthorName: string,
    commentBody: string,
  ): Promise<void> {
    try {
      // Get ticket details to find creator and assignee
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          filedByUserId: true,
          assignedToUserId: true,
        },
      });

      if (!ticket) {
        this.logger.warn(
          `Ticket ${ticketId} not found for comment notification`,
        );
        return;
      }

      const subject = `New Comment on Ticket: ${ticketTitle.substring(0, 50)}`;
      const body = `${commentAuthorName} added a comment:\n\n${commentBody.substring(0, 200)}${commentBody.length > 200 ? '...' : ''}\n\nPlease log in to view the full comment.`;

      // Notify ticket creator (if not the comment author)
      if (ticket.filedByUserId !== commentAuthorId) {
        await this.create({
          recipientUserId: ticket.filedByUserId,
          ticketId,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          type: NotificationType.CommentAdded,
          channel: NotificationChannel.InApp,
          subject,
          body,
        });
      }

      // Notify assigned staff (if exists and not the comment author)
      if (
        ticket.assignedToUserId &&
        ticket.assignedToUserId !== commentAuthorId
      ) {
        await this.create({
          recipientUserId: ticket.assignedToUserId,
          ticketId,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          type: NotificationType.CommentAdded,
          channel: NotificationChannel.InApp,
          subject,
          body,
        });
      }

      this.logger.log(
        `Comment added notifications created for ticket ${ticketId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create comment added notification for ticket ${ticketId}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw - notification failure shouldn't block comment creation
    }
  }

  async notifyCommentAdded(
    ticketId: string,
    ticketTitle: string,
    commentAuthorId: string,
    commentAuthorName: string,
    commentBody: string,
  ): Promise<void> {
    try {
      const payload: CommentAddedNotificationJobData = {
        ticketId,
        ticketTitle,
        commentAuthorId,
        commentAuthorName,
        commentBody,
      };

      await this.notificationsQueue.add(
        JOB_NAMES.SEND_COMMENT_ADDED_NOTIFICATION,
        payload,
        {
          attempts: RETRY_CONFIG.ATTEMPTS,
          backoff: {
            type: RETRY_CONFIG.BACKOFF_TYPE,
            delay: RETRY_CONFIG.BACKOFF_DELAY,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(
        `Queued comment added notifications for ticket ${ticketId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue comment added notifications for ticket ${ticketId}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw - notification failure shouldn't block comment creation
    }
  }
}
