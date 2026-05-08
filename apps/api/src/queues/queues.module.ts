import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FilesProcessor } from './files.processor';
import { MailProcessor } from './mail.processor';
import { NotificationsProcessor } from './notifications.processor';
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
    NotificationsModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.FILES },
      { name: QUEUE_NAMES.MAIL },
      { name: QUEUE_NAMES.NOTIFICATIONS },
    ),
  ],
  controllers: [FailedJobsController, HealthController],
  providers: [
    FilesProcessor,
    MailProcessor,
    NotificationsProcessor,
    FailedJobsService,
    CleanupService,
  ],
  exports: [FailedJobsService],
})
export class QueuesModule {}
