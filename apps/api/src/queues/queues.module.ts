import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { FilesProcessor } from './files.processor';
import { FailedJobsService } from './failed-jobs.service';
import { FailedJobsController } from './failed-jobs.controller';
import { CleanupService } from './cleanup.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    PrismaModule,
    AttachmentsModule,
    BullModule.registerQueue({ name: 'files' }),
  ],
  controllers: [FailedJobsController, HealthController],
  providers: [FilesProcessor, FailedJobsService, CleanupService],
  exports: [FailedJobsService],
})
export class QueuesModule {}
