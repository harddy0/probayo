import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as storageInterface from '../attachments/storage/storage.interface';
import { FailedJobsService } from './failed-jobs.service';

interface FileJobData {
  ticketId: string;
  userId: string;
  commentId: string | null;
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: any;
  };
}

interface FileJobResult {
  success: boolean;
  attachmentId?: string;
  filePath?: string;
  error?: string;
}

@Processor('files')
export class FilesProcessor extends WorkerHost {
  private readonly logger = new Logger(FilesProcessor.name);

  constructor(
    private prisma: PrismaService,
    @Inject('IStorageService')
    private storage: storageInterface.IStorageService,
    private failedJobsService: FailedJobsService,
  ) {
    super();
  }

  async process(
    job: Job<FileJobData, FileJobResult, string>,
  ): Promise<FileJobResult> {
    const { ticketId, userId, commentId, file } = job.data;

    this.logger.log(`[Job ${job.id}] Processing: ${file.originalname}`);

    try {
      await job.updateProgress(10);

      let fileBuffer: Buffer;

      if (file.buffer) {
        if (Buffer.isBuffer(file.buffer)) {
          fileBuffer = file.buffer;
        } else if (
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          file.buffer.type === 'Buffer' &&
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          Array.isArray(file.buffer.data)
        ) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          fileBuffer = Buffer.from(file.buffer.data);
        } else if (Array.isArray(file.buffer)) {
          fileBuffer = Buffer.from(file.buffer);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        } else if (file.buffer.data && Array.isArray(file.buffer.data)) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          fileBuffer = Buffer.from(file.buffer.data);
        } else {
          fileBuffer = Buffer.from(JSON.stringify(file.buffer));
        }
      } else {
        throw new Error('No buffer data in job');
      }

      await job.updateProgress(25);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const multerFile = {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: fileBuffer,
      } as any;

      const filePath = await this.storage.save(multerFile, ticketId);
      await job.updateProgress(50);

      const attachment = await this.prisma.ticketAttachment.create({
        data: {
          ticketId,
          commentId: commentId || null,
          uploadedByUserId: userId,
          fileUrlOrPath: filePath,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSizeBytes: file.size,
        },
      });

      await job.updateProgress(75);
      this.logger.log(`[Job ${job.id}] Attachment: ${attachment.id}`);

      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });

      await job.updateProgress(100);

      return {
        success: true,
        attachmentId: attachment.id,
        filePath: filePath,
      };
    } catch (error) {
      this.logger.error(`[Job ${job.id}] Failed:`, error);

      const maxRetries = job.opts.attempts || 3;
      if (job.attemptsMade >= maxRetries) {
        await this.failedJobsService.recordFailedJob(job, error as Error);
      }

      throw error;
    }
  }
}
