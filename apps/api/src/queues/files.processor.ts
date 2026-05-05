import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as storageInterface from '../attachments/storage/storage.interface';
import { FileJobData, FileJobResult } from './interfaces/file-job.interface';

@Processor('files')
export class FilesProcessor extends WorkerHost {
  private readonly logger = new Logger(FilesProcessor.name);

  constructor(
    private prisma: PrismaService,
    @Inject('IStorageService')
    private storage: storageInterface.IStorageService,
  ) {
    super();
  }

  async process(
    job: Job<FileJobData, FileJobResult, string>,
  ): Promise<FileJobResult> {
    const { ticketId, userId, commentId, file } = job.data;

    this.logger.log(
      `[Job ${job.id}] Processing file: ${file.originalname} for ticket ${ticketId}`,
    );

    try {
      // FIX: Reconstruct buffer from serialized data
      this.logger.debug(`[Job ${job.id}] Reconstructing file buffer...`);
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

      this.logger.debug(
        `[Job ${job.id}] Buffer size: ${fileBuffer.length} bytes`,
      );
      await job.updateProgress(25);

      // Create Multer-like file object
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const multerFile = {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: fileBuffer,
      } as any;
      // Save to storage
      this.logger.debug(`[Job ${job.id}] Saving file to storage...`);
      const filePath = await this.storage.save(multerFile, ticketId);
      this.logger.debug(`[Job ${job.id}] File saved at: ${filePath}`);
      await job.updateProgress(50);

      // Create database record
      this.logger.debug(`[Job ${job.id}] Creating database record...`);
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
      this.logger.log(`[Job ${job.id}] Attachment created: ${attachment.id}`);

      // Update ticket timestamp
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
      throw error;
    }
  }
}
