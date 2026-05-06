import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectQueue('files') private filesQueue: Queue,
    private prisma: PrismaService,
  ) {}

  @Get('queue')
  @ApiOperation({ summary: 'Queue health check' })
  async checkQueueHealth() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.filesQueue.getWaitingCount(),
        this.filesQueue.getActiveCount(),
        this.filesQueue.getCompletedCount(),
        this.filesQueue.getFailedCount(),
        this.filesQueue.getDelayedCount(),
      ]);

      const isRedisConnected = await (await this.filesQueue.client).ping();

      return {
        status: 'healthy',
        redis: isRedisConnected === 'PONG',
        counts: { waiting, active, completed, failed, delayed },
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      return {
        status: 'unhealthy',
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('failed-jobs/count')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Get failed jobs count' })
  async getFailedJobsCount() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const count = await this.prisma.failedJob.count({
      where: { resolved_at: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { failedJobsCount: count, hasFailures: count > 0 };
  }
}
