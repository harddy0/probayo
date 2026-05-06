import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import type { File as MulterFile } from 'multer';
import { Readable } from 'stream';
import type { IStorageService } from './storage/storage.interface';

type AttachmentUser = {
  id: string;
  role: UserRole;
  departmentId: string | null;
};

type AttachmentTicket = {
  departmentId: string;
  filedByUserId: string;
};

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  constructor(
    private prisma: PrismaService,
    @Inject('IStorageService') private storage: IStorageService,
  ) {}

  // ==================== PERMISSION VERIFICATION ====================
  async verifyUploadPermission(
    ticketId: string,
    userId: string,
  ): Promise<void> {
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
  }

  async verifyCommentExists(
    commentId: string,
    ticketId: string,
  ): Promise<void> {
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

  // ==================== CORE FILE PROCESSING (Called by Processor) ====================
  processAndSaveAttachment(
    ticketId: string,
    userId: string,
    file: MulterFile,
    commentId: string | null = null,
  ): any {
    // This method will be called by FilesProcessor
    // Storage injection will happen via processor, not here
    // Return the created attachment record
    return {
      ticketId,
      userId,
      commentId,
      file: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        originalname: file.originalname,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        mimetype: file.mimetype,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        size: file.size,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        buffer: file.buffer,
      },
    };
  }

  // ==================== READ OPERATIONS ====================
  async getTicketAttachments(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const canView = this.canViewTicket(user as AttachmentUser, ticket);
    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to view attachments for this ticket',
      );
    }

    const attachments = await this.prisma.ticketAttachment.findMany({
      where: { ticketId, commentId: null },
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

    const canView = this.canViewTicket(user as AttachmentUser, comment.ticket);

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
      orderBy: { createdAt: 'desc' },
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const canView = this.canViewTicket(
      user as AttachmentUser,
      attachment.ticket,
    );

    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to download this attachment',
      );
    }

    // Note: Actual file retrieval will be handled by storage service
    // This is metadata only - storage service will be called separately
    return {
      attachmentId: attachment.id,
      fileUrlOrPath: attachment.fileUrlOrPath,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const canDelete =
      attachment.uploadedByUserId === userId ||
      user.role === UserRole.Admin ||
      user.role === UserRole.ItStaff;

    if (!canDelete) {
      throw new ForbiddenException(
        'You do not have permission to delete this attachment',
      );
    }

    // Return attachment info for processor to delete physical file
    return {
      attachmentId: attachment.id,
      fileUrlOrPath: attachment.fileUrlOrPath,
    };
  }

  // ==================== HELPER METHODS ====================

  private canUploadToTicket(
    user: AttachmentUser,
    ticket: AttachmentTicket,
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

  private canViewTicket(
    user: AttachmentUser,
    ticket: AttachmentTicket,
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
  // Add this method to AttachmentsService class:
  async getTicketIdFromComment(commentId: string): Promise<string> {
    const comment = await this.prisma.ticketComment.findUnique({
      where: { id: commentId },
      select: { ticketId: true },
    });
    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }
    return comment.ticketId;
  }
  async getDownloadStream(
    attachmentId: string,
    userId: string,
  ): Promise<{
    stream: Readable;
    fileName: string;
    fileType: string;
    fileSize: number;
  }> {
    const attachment = await this.prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const canView = this.canViewTicket(
      user as AttachmentUser,
      attachment.ticket,
    );

    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to download this attachment',
      );
    }

    const stream = await this.storage.getStream(attachment.fileUrlOrPath);

    return {
      stream,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSizeBytes || 0,
    };
  }
}
