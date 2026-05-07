import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { MailModule } from '../mail/mail.module';
import { FilesProcessor } from './files.processor';
import { MailProcessor } from './mail.processor';
import { FailedJobsService } from './failed-jobs.service';
import { FailedJobsController } from './failed-jobs.controller';
import { CleanupService } from './cleanup.service';
import { HealthController } from './health.controller';
import { QUEUE_NAMES } from './constants/queue.constants';

@Module({
  imports: [
    PrismaModule,
    AttachmentsModule,
    MailModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.FILES },
      { name: QUEUE_NAMES.MAIL },
    ),
  ],
  controllers: [FailedJobsController, HealthController],
  providers: [FilesProcessor, MailProcessor, FailedJobsService, CleanupService],
  exports: [FailedJobsService],
})
export class QueuesModule {}
