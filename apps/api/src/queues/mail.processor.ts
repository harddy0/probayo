import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { FailedJobsService } from './failed-jobs.service';
import { QUEUE_NAMES, JOB_NAMES } from './constants/queue.constants';

interface EscalationJobData {
  ticketId: string;
  breachType: 'acknowledgement' | 'resolution';
}

interface BreachNotificationJobData {
  ticketId: string;
  ticketTitle: string;
  ticketPriority: string;
  breachType: 'acknowledgement' | 'resolution';
  notifyEmail: string;
  notifyName: string;
}

@Processor(QUEUE_NAMES.MAIL)
@Injectable()
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly failedJobsService: FailedJobsService,
  ) {
    super();
  }

  async process(job: Job<EscalationJobData>): Promise<{ success: boolean }> {
    this.logger.log(
      `[Job ${job.id as string}] Processing mail job: ${job.name}`,
    );

    try {
      // Route the job based on its name
      if (job.name === JOB_NAMES.SEND_ESCALATION_EMAIL) {
        await this.handleEscalationEmail(job.data);
      } else if (job.name === JOB_NAMES.SEND_BREACH_NOTIFICATION_EMAIL) {
        await this.handleBreachNotificationEmail(
          job.data as BreachNotificationJobData,
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

  private async handleBreachNotificationEmail(data: BreachNotificationJobData) {
    const shortId = data.ticketId.split('-')[0];
    const subject = `⚠️ SLA VIOLATION: Ticket #${shortId}`;

    const htmlContent = `
      <h2>Immediate Action Required: SLA Violation</h2>
      <p>Hi ${data.notifyName},</p>
      <p>The SLA for the following ticket has just lapsed. Please take action immediately to prevent further escalation.</p>
      <ul>
        <li><strong>Ticket:</strong> ${data.ticketTitle}</li>
        <li><strong>Priority:</strong> <span style="color:orange; text-transform:uppercase;">${data.ticketPriority}</span></li>
        <li><strong>Violated SLA:</strong> ${data.breachType}</li>
      </ul>
      <p>Please log in to the Helpdesk system to address this.</p>
    `;

    await this.mailService.sendEmail(data.notifyEmail, subject, htmlContent);
  }

  private async handleEscalationEmail(data: EscalationJobData) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: data.ticketId },
      include: { department: { include: { headUser: true } } },
    });

    if (!ticket || !ticket.department?.headUser) {
      this.logger.warn(
        `Cannot send escalation: Ticket ${data.ticketId} missing or has no department head.`,
      );
      return;
    }

    const headEmail = ticket.department.headUser.email;
    const shortId = ticket.id.split('-')[0];
    const subject = `🚨 URGENT SLA BREACH: Ticket #${shortId}`;

    const htmlContent = `
      <h2>SLA Breach Notification</h2>
      <p><strong>Ticket:</strong> ${ticket.title}</p>
      <p><strong>Priority:</strong> <span style="color:red; text-transform:uppercase;">${ticket.priority}</span></p>
      <p><strong>Breach Type:</strong> ${data.breachType}</p>
      <p>Please review immediately.</p>
    `;

    await this.mailService.sendEmail(headEmail, subject, htmlContent);
  }
}
