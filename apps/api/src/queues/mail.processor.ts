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
      if (job.name === JOB_NAMES.SEND_ESCALATION_EMAIL) {
        await this.handleEscalationEmail(job.data);
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
