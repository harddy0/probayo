import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { FailedJobsService } from './failed-jobs.service';
import { JOB_NAMES, QUEUE_NAMES } from './constants/queue.constants';
import {
  NotificationsService,
  TicketCreatedNotificationJobData,
  StatusChangedNotificationJobData,
  CommentAddedNotificationJobData,
  KnownIssueResolvedNotificationJobData,
} from '../notifications/notifications.service';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
@Injectable()
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly failedJobsService: FailedJobsService,
  ) {
    super();
  }

  async process(job: Job): Promise<{ success: boolean }> {
    this.logger.log(
      `[Job ${job.id as string}] Processing notification job: ${job.name}`,
    );

    try {
      if (job.name === JOB_NAMES.SEND_TICKET_CREATED_NOTIFICATION) {
        const data = job.data as TicketCreatedNotificationJobData;
        await this.notificationsService.createTicketCreatedNotifications(
          data.ticketId,
          data.ticketTitle,
          data.filedByName,
          data.departmentName,
          data.priority,
        );
      } else if (job.name === JOB_NAMES.SEND_TICKET_ASSIGNED_NOTIFICATION) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data = job.data;

        await this.notificationsService.createTicketAssignedNotifications(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          data.ticketId as string,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          data.ticketTitle as string,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          data.assigneeId as string,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          data.assigneeName as string,
        );
      } else if (job.name === JOB_NAMES.SEND_STATUS_CHANGED_NOTIFICATION) {
        const data = job.data as StatusChangedNotificationJobData;
        await this.notificationsService.createStatusChangedNotifications(
          data.ticketId,
          data.ticketTitle,
          data.creatorId,
          data.creatorName,
          data.oldStatus,
          data.newStatus,
        );
      } else if (job.name === JOB_NAMES.SEND_COMMENT_ADDED_NOTIFICATION) {
        const data = job.data as CommentAddedNotificationJobData;
        await this.notificationsService.createCommentAddedNotifications(
          data.ticketId,
          data.ticketTitle,
          data.commentAuthorId,
          data.commentAuthorName,
          data.commentBody,
        );
      } else if (
        job.name === JOB_NAMES.SEND_KNOWN_ISSUE_RESOLVED_NOTIFICATION
      ) {
        const data = job.data as KnownIssueResolvedNotificationJobData;
        await this.notificationsService.createKnownIssueResolvedNotifications(
          data.knownIssueId,
          data.title,
          data.description,
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`[Job ${job.id as string}] Failed:`, error);
      const maxRetries = job.opts.attempts ?? 3;
      if (job.attemptsMade >= maxRetries) {
        await this.failedJobsService.recordFailedJob(job, error as Error);
      }
      throw error;
    }
  }
}
