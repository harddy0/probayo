/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Job } from 'bullmq';

@Injectable()
export class FailedJobsService {
  private readonly logger = new Logger(FailedJobsService.name);

  constructor(private prisma: PrismaService) {}

  async recordFailedJob(job: Job, error: Error): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.prisma.failedJob.create({
        data: {
          queue: job.queueName,
          payload: job.data,
          exception: `${error.message}\n${error.stack || ''}`,
          retry_count: job.attemptsMade,
        },
      });
      this.logger.warn(`Recorded failed job ${job.id}`);
    } catch (err) {
      this.logger.error(`Failed to record failed job: ${err}`);
    }
  }

  getAllFailedJobs() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.failedJob.findMany({
      orderBy: { failed_at: 'desc' },
    });
  }

  getFailedJob(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.failedJob.findUnique({ where: { id } });
  }

  async retryFailedJob(id: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const failedJob = await this.prisma.failedJob.findUnique({
      where: { id },
    });
    if (!failedJob) return false;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.prisma.failedJob.update({
      where: { id },
      data: { resolved_at: new Date() },
    });
    return true;
  }

  deleteFailedJob(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.prisma.failedJob.delete({ where: { id } });
  }

  async deleteResolvedJobs(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const result = await this.prisma.failedJob.deleteMany({
      where: { resolved_at: { not: null } },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return result.count;
  }
}
