import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FailedJobsService } from './failed-jobs.service';

@ApiTags('queues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@Controller('admin/failed-jobs')
export class FailedJobsController {
  constructor(private readonly failedJobsService: FailedJobsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all failed jobs' })
  findAll() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.failedJobsService.getAllFailedJobs();
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed job' })
  async retry(@Param('id') id: string) {
    return this.failedJobsService.retryFailedJob(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a failed job record' })
  delete(@Param('id') id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.failedJobsService.deleteFailedJob(id);
  }

  @Delete('resolved/cleanup')
  @ApiOperation({ summary: 'Delete all resolved failed jobs' })
  async cleanupResolved() {
    const count = await this.failedJobsService.deleteResolvedJobs();
    return { message: `Deleted ${count} resolved failed jobs` };
  }
}
