import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as storageInterface from '../attachments/storage/storage.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject('IStorageService')
    private storage: storageInterface.IStorageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOrphanedFiles() {
    this.logger.log('Starting orphaned file cleanup...');

    try {
      const attachments = await this.prisma.ticketAttachment.findMany({
        select: { fileUrlOrPath: true },
      });

      const dbPaths = new Set(attachments.map((a) => a.fileUrlOrPath));
      const storageType = process.env.STORAGE_TYPE || 'local';

      if (storageType === 'local') {
        await this.cleanupLocalFiles('./uploads', dbPaths);
      }

      this.logger.log('Cleanup completed');
    } catch (error) {
      this.logger.error('Cleanup failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupPasswordResetTokens() {
    this.logger.log('Starting password reset token cleanup...');

    try {
      const now = new Date();
      const retentionDays = this.getResetTokenRetentionDays();
      const usedBefore = new Date(
        now.getTime() - retentionDays * 24 * 60 * 60 * 1000,
      );

      const result = await this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { usedAt: { not: null, lt: usedBefore } },
          ],
        },
      });

      this.logger.log(
        `Password reset token cleanup removed ${result.count} rows`,
      );
    } catch (error) {
      this.logger.error('Password reset token cleanup failed:', error);
    }
  }

  private async cleanupLocalFiles(dir: string, dbPaths: Set<string>) {
    try {
      const files = await this.readAllFiles(dir);

      for (const file of files) {
        const relativePath = file.replace(/\\/g, '/');
        if (!dbPaths.has(relativePath)) {
          this.logger.warn(`Deleting orphaned: ${relativePath}`);
          await fs
            .unlink(file)
            .catch((e) => this.logger.error(`Failed to delete:`, e));
        }
      }
    } catch (error) {
      this.logger.error('Error scanning:', error);
    }
  }

  private async readAllFiles(dir: string): Promise<string[]> {
    let results: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(await this.readAllFiles(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }

  private getResetTokenRetentionDays(): number {
    const rawValue = this.configService.get('RESET_TOKEN_USED_RETENTION_DAYS');
    const retentionDays = Number(rawValue);

    if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
      return 90;
    }

    return retentionDays;
  }
}
