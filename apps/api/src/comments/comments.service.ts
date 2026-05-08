import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UserRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

type CommentUser = {
  id: string;
  role: UserRole;
  departmentId: string | null;
};

type CommentTicket = {
  departmentId: string;
  filedByUserId: string;
};

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, createCommentDto: CreateCommentDto) {
    // Verify ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: createCommentDto.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${createCommentDto.ticketId} not found`,
      );
    }

    // Verify user has permission to comment on this ticket
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const canComment = this.canCommentOnTicket(user, ticket);
    if (!canComment) {
      throw new ForbiddenException(
        'You do not have permission to comment on this ticket',
      );
    }

    // Create comment
    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId: createCommentDto.ticketId,
        authorUserId: userId,
        body: createCommentDto.body,
        isInternal: createCommentDto.isInternal || false,
      },
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
    });

    // Notify participants about the new comment
    if (!comment.isInternal) {
      const authorName =
        `${comment.authorUser.firstName || ''} ${comment.authorUser.lastName || ''}`.trim();
      void this.notificationsService.notifyCommentAdded(
        ticket.id,
        ticket.title,
        userId,
        authorName,
        comment.body,
      );
    }

    return comment;
  }

  async findAll(ticketId: string, userId: string) {
    // Verify ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    // Check permission
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const canView = this.canViewTicket(user, ticket);
    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to view comments on this ticket',
      );
    }

    // Filter internal comments based on role
    const isIT = user.role === UserRole.Admin || user.role === UserRole.ItStaff;

    return this.prisma.ticketComment.findMany({
      where: {
        ticketId,
        ...(!isIT ? { isInternal: false } : {}),
      },
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
    });
  }

  async findOne(id: string, userId: string) {
    const comment = await this.prisma.ticketComment.findUnique({
      where: { id },
      include: {
        ticket: true,
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
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${id} not found`);
    }

    // Check permission
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const canView = this.canViewTicket(user, comment.ticket);
    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to view this comment',
      );
    }

    // Hide internal comments from non-IT
    const isIT = user.role === UserRole.Admin || user.role === UserRole.ItStaff;
    if (comment.isInternal && !isIT) {
      throw new ForbiddenException(
        'You do not have permission to view this internal comment',
      );
    }

    return comment;
  }

  async update(id: string, userId: string, updateCommentDto: UpdateCommentDto) {
    const comment = await this.prisma.ticketComment.findUnique({
      where: { id },
      include: { ticket: true },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${id} not found`);
    }

    // Only author or admin can update
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (comment.authorUserId !== userId && user.role !== UserRole.Admin) {
      throw new ForbiddenException('You can only update your own comments');
    }

    return this.prisma.ticketComment.update({
      where: { id },
      data: {
        body: updateCommentDto.body,
      },
      include: {
        authorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.ticketComment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${id} not found`);
    }

    // Only author or admin can delete
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (comment.authorUserId !== userId && user.role !== UserRole.Admin) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.prisma.ticketComment.delete({
      where: { id },
    });
  }

  // ==================== HELPER METHODS ====================

  private canCommentOnTicket(
    user: CommentUser,
    ticket: CommentTicket,
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

  private canViewTicket(user: CommentUser, ticket: CommentTicket): boolean {
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
}
