import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import { IStorageService } from './storage/storage.interface';
import { UserRole } from '@prisma/client';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject('IStorageService') private storage: IStorageService,
  ) {}

  async uploadAttachment(
    ticketId: string,
    userId: string,
    file: Express.Multer.File,
    commentId?: string,
  ) {
    // Verify ticket exists and user has access
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

    const canUpload = this.canUploadToTicket(user, ticket);
    if (!canUpload) {
      throw new ForbiddenException(
        'You do not have permission to upload attachments to this ticket',
      );
    }

    // If commentId provided, verify comment exists and belongs to this ticket
    if (commentId) {
      const comment = await this.prisma.ticketComment.findFirst({
        where: {
          id: commentId,
          ticketId: ticketId,
        },
      });

      if (!comment) {
        throw new NotFoundException(
          `Comment ${commentId} not found on ticket ${ticketId}`,
        );
      }
    }

    // Store file physically
    const filePath = await this.storage.save(file, ticketId);

    // Create database record
    const attachment = await this.prisma.ticketAttachment.create({
      data: {
        ticketId,
        commentId: commentId || null,
        uploadedByUserId: userId,
        fileUrlOrPath: filePath,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        fileName: file.originalname,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        fileType: file.mimetype,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        fileSizeBytes: file.size,
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(
      `Attachment uploaded: ${attachment.id} for ticket ${ticketId}`,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.toResponseDto(attachment);
  }

  async getTicketAttachments(ticketId: string, userId: string) {
    // Verify access
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const canView = this.canViewTicket(user, ticket);
    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to view attachments for this ticket',
      );
    }

    const attachments = await this.prisma.ticketAttachment.findMany({
      where: { ticketId },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return attachments.map((att) => this.toResponseDto(att));
  }

  async getCommentAttachments(commentId: string, userId: string) {
    const comment = await this.prisma.ticketComment.findUnique({
      where: { id: commentId },
      include: { ticket: true },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const canView = this.canViewTicket(user, comment.ticket);
    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to view attachments for this comment',
      );
    }

    const attachments = await this.prisma.ticketAttachment.findMany({
      where: { commentId },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return attachments.map((att) => this.toResponseDto(att));
  }

  async downloadAttachment(attachmentId: string, userId: string) {
    const attachment = await this.prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Verify user has access to the ticket
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const canView = this.canViewTicket(user, attachment.ticket);
    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to download this attachment',
      );
    }

    // Get file from storage
    const fileBuffer = await this.storage.get(attachment.fileUrlOrPath);

    return {
      buffer: fileBuffer,
      filename: attachment.fileName,
      mimeType: attachment.fileType,
    };
  }

  async deleteAttachment(attachmentId: string, userId: string) {
    const attachment = await this.prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Check permission (uploader, IT staff, or admin)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const canDelete =
      attachment.uploadedByUserId === userId ||
      user.role === UserRole.admin ||
      user.role === UserRole.it_staff;

    if (!canDelete) {
      throw new ForbiddenException(
        'You do not have permission to delete this attachment',
      );
    }

    // Delete physical file
    await this.storage.delete(attachment.fileUrlOrPath);

    // Delete database record
    await this.prisma.ticketAttachment.delete({
      where: { id: attachmentId },
    });

    this.logger.log(`Attachment deleted: ${attachmentId}`);

    return { message: 'Attachment deleted successfully' };
  }

  // ==================== HELPER METHODS ====================

  private canUploadToTicket(user: any, ticket: any): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    switch (user.role) {
      case UserRole.admin:
        return true;
      case UserRole.it_staff:
        return true;
      case UserRole.department_head:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return user.departmentId === ticket.departmentId;
      case UserRole.employee:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return user.id === ticket.filedByUserId;
      default:
        return false;
    }
  }

  private canViewTicket(user: any, ticket: any): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    switch (user.role) {
      case UserRole.admin:
        return true;
      case UserRole.it_staff:
        return true;
      case UserRole.department_head:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return user.departmentId === ticket.departmentId;
      case UserRole.employee:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return user.id === ticket.filedByUserId;
      default:
        return false;
    }
  }

  private toResponseDto(attachment: any): any {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      id: attachment.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      ticketId: attachment.ticketId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      commentId: attachment.commentId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      fileName: attachment.fileName,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      fileType: attachment.fileType,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      fileSizeBytes: attachment.fileSizeBytes,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      downloadUrl: `/api/attachments/${attachment.id}/download`,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      uploadedBy: attachment.uploadedByUser
        ? {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            id: attachment.uploadedByUser.id,
            fullName:
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `${attachment.uploadedByUser.firstName || ''} ${attachment.uploadedByUser.lastName || ''}`.trim(),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            email: attachment.uploadedByUser.email,
          }
        : null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      createdAt: attachment.createdAt,
    };
  }
}
