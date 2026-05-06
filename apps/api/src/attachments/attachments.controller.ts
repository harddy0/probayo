import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  Res,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';
import { AttachmentResponseDto } from './dto/attachment-response.dto';
import * as storageInterface from './storage/storage.interface';
import type { File as MulterFile } from 'multer';
import { JOB_NAMES } from '../queues/constants/queue.constants';

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  private readonly MAX_FILE_SIZE_MB = 10;
  private readonly MAX_FILE_SIZE_BYTES = this.MAX_FILE_SIZE_MB * 1024 * 1024;
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
  ];

  constructor(
    private readonly attachmentsService: AttachmentsService,
    @InjectQueue('files') private filesQueue: Queue,
    @Inject('IStorageService')
    private storage: storageInterface.IStorageService,
  ) {}

  private validateFile(file: MulterFile): void {
    // Check file exists
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Check file size
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `File size exceeds ${this.MAX_FILE_SIZE_MB}MB limit. Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      );
    }

    // Check MIME type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `File type ${file.mimetype} not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  @Post('tickets/:ticketId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload attachment to a ticket (async)' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: 'File upload queued successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'Permission denied',
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async uploadToTicket(
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: MulterFile,
    @Request() req: { user: { id: string } },
  ) {
    // Validate file
    this.validateFile(file);

    // Verify permissions synchronously before queuing
    await this.attachmentsService.verifyUploadPermission(ticketId, req.user.id);

    // Queue the file processing job
    const job = await this.filesQueue.add(JOB_NAMES.PROCESS_FILE, {
      ticketId,
      userId: req.user.id,
      commentId: null,
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
    });

    return {
      message: 'File upload queued successfully',
      jobId: job.id,
      ticketId: ticketId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      fileName: file.originalname,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      fileSize: file.size,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      fileType: file.mimetype,
      status: 'queued',
      statusCheckUrl: `/api/attachments/jobs/${job.id}/status`,
    };
  }

  @Post('comments/:commentId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload attachment to a comment (async)' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: 'File upload queued successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'Permission denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found',
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async uploadToComment(
    @Param('commentId') commentId: string,
    @UploadedFile() file: MulterFile,
    @Request() req: { user: { id: string } },
  ) {
    // Validate file
    this.validateFile(file);

    // Get ticket ID from comment
    const ticketId =
      await this.attachmentsService.getTicketIdFromComment(commentId);

    // Verify permissions
    await this.attachmentsService.verifyUploadPermission(ticketId, req.user.id);
    await this.attachmentsService.verifyCommentExists(commentId, ticketId);

    // Queue the file processing job
    const job = await this.filesQueue.add(JOB_NAMES.PROCESS_FILE, {
      ticketId: ticketId,
      userId: req.user.id,
      commentId: commentId,
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
    });

    return {
      message: 'File upload queued successfully',
      jobId: job.id,
      commentId: commentId,
      ticketId: ticketId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      fileName: file.originalname,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      fileSize: file.size,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      fileType: file.mimetype,
      status: 'queued',
      statusCheckUrl: `/api/attachments/jobs/${job.id}/status`,
    };
  }

  @Get('jobs/:jobId/status')
  @ApiOperation({ summary: 'Check upload job status' })
  @ApiParam({ name: 'jobId', description: 'BullMQ Job ID' })
  @ApiResponse({ status: 200, description: 'Returns job status' })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @SkipThrottle()
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.filesQueue.getJob(jobId);
    if (!job) {
      return {
        jobId,
        exists: false,
        message: 'Job not found or already completed/removed',
      };
    }
    const state = await job.getState();
    const progress = job.progress;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = job.returnvalue;
    const failedReason = job.failedReason;
    return {
      jobId,
      exists: true,
      state,
      progress,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result,
      failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }

  @Get('tickets/:ticketId')
  @ApiOperation({ summary: 'Get all attachments for a ticket' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all attachments for the ticket',
    type: [AttachmentResponseDto],
  })
  async getTicketAttachments(
    @Param('ticketId') ticketId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.attachmentsService.getTicketAttachments(ticketId, req.user.id);
  }

  @Get('comments/:commentId')
  @ApiOperation({ summary: 'Get all attachments for a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all attachments for the comment',
    type: [AttachmentResponseDto],
  })
  async getCommentAttachments(
    @Param('commentId') commentId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.attachmentsService.getCommentAttachments(
      commentId,
      req.user.id,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @SkipThrottle()
  @Get(':id/download')
  @ApiOperation({ summary: 'Download an attachment (streaming)' })
  @ApiParam({ name: 'id', description: 'Attachment UUID' })
  @ApiResponse({ status: 200, description: 'Returns the file stream' })
  async download(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Res() res: Response,
  ) {
    const { stream, fileName, fileType, fileSize } =
      await this.attachmentsService.getDownloadStream(id, req.user.id);

    res.setHeader('Content-Type', fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileSize);

    // Pipe the stream to response
    stream.pipe(res);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an attachment' })
  @ApiParam({ name: 'id', description: 'Attachment UUID' })
  @ApiResponse({ status: 200, description: 'Attachment deleted successfully' })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @SkipThrottle()
  async delete(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    const { attachmentId, fileUrlOrPath } =
      await this.attachmentsService.deleteAttachment(id, req.user.id);
    // Delete physical file from storage
    await this.storage.delete(fileUrlOrPath);
    return {
      message: 'Attachment deleted successfully',
      attachmentId: attachmentId,
    };
  }
}
