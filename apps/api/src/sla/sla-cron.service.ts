import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  TicketStatus,
  UserRole,
  EscalationNotifyRole,
  SlaType,
} from '@prisma/client';
import {
  QUEUE_NAMES,
  JOB_NAMES,
  RETRY_CONFIG,
} from '../queues/constants/queue.constants';

@Injectable()
export class SlaCronService {
  private readonly logger = new Logger(SlaCronService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.MAIL) private readonly mailQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSlaViolations(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    const startTime = Date.now();

    try {
      const now = new Date();

      // ==========================================
      // PHASE 1: MARK BREACHES
      // ==========================================
      const unbreachedTickets = await this.prisma.ticket.findMany({
        where: {
          status: {
            notIn: [
              TicketStatus.Closed,
              TicketStatus.Resolved,
              TicketStatus.PendingUser,
            ],
          },
          OR: [
            {
              slaAckBreached: false,
              acknowledgedAt: null,
              slaAckDeadline: { lte: now },
            },
            {
              slaResolutionBreached: false,
              resolvedAt: null,
              slaResolutionDeadline: { lte: now },
            },
          ],
        },
      });

      for (const ticket of unbreachedTickets) {
        const updates: {
          slaAckBreached?: boolean;
          slaResolutionBreached?: boolean;
        } = {};

        if (
          !ticket.acknowledgedAt &&
          !ticket.slaAckBreached &&
          now > ticket.slaAckDeadline
        ) {
          updates.slaAckBreached = true;
        }

        if (
          !ticket.resolvedAt &&
          !ticket.slaResolutionBreached &&
          now > ticket.slaResolutionDeadline
        ) {
          updates.slaResolutionBreached = true;
        }

        if (Object.keys(updates).length > 0) {
          await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: updates,
          });
        }
      }

      // ==========================================
      // PHASE 2: PROCESS ESCALATIONS
      // ==========================================
      const activeBreachedTickets = await this.prisma.ticket.findMany({
        where: {
          status: {
            notIn: [
              TicketStatus.Closed,
              TicketStatus.Resolved,
              TicketStatus.PendingUser,
            ],
          },
          OR: [{ slaAckBreached: true }, { slaResolutionBreached: true }],
        },
        include: {
          department: { include: { headUser: true } },
          escalations: true, // Fetch previous escalation events to prevent spam
        },
      });

      if (
        activeBreachedTickets.length === 0 &&
        unbreachedTickets.length === 0
      ) {
        return;
      }

      // Fetch rules and admins once to save DB calls
      const allRules = await this.prisma.escalationRule.findMany();
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.Admin, isActive: true },
      });

      for (const ticket of activeBreachedTickets) {
        if (ticket.slaAckBreached && !ticket.acknowledgedAt) {
          await this.processEscalations(
            ticket,
            allRules,
            SlaType.Acknowledgement,
            ticket.slaAckDeadline,
            now,
            admins,
          );
        }

        if (ticket.slaResolutionBreached && !ticket.resolvedAt) {
          await this.processEscalations(
            ticket,
            allRules,
            SlaType.Resolution,
            ticket.slaResolutionDeadline,
            now,
            admins,
          );
        }
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `SLA Check Complete: ${unbreachedTickets.length} new breaches marked, ${activeBreachedTickets.length} breached tickets evaluated for escalation (${elapsed}ms)`,
      );
    } catch (error) {
      this.logger.error('SLA violation cron failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processEscalations(
    ticket: any,
    allRules: any[],
    slaType: SlaType,
    deadline: Date,
    now: Date,
    admins: any[],
  ) {
    // Find rules that apply to this ticket's priority and this specific SLA type
    const rules = allRules.filter(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (r) => r.priorityLevel === ticket.priority && r.slaType === slaType,
    );

    for (const rule of rules) {
      // Calculate exactly when this escalation should fire based on the DB rule
      const triggerTime = new Date(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        deadline.getTime() + rule.triggerAfterMinutes * 60000,
      );

      if (now >= triggerTime) {
        let recipients: any[] = [];

        // Dynamically assign recipients based on the rule
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (rule.notifyRole === EscalationNotifyRole.Admin) {
          recipients = admins;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        } else if (rule.notifyRole === EscalationNotifyRole.DepartmentHead) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (ticket.department?.headUser) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            recipients = [ticket.department.headUser];
          }
        }

        for (const recipient of recipients) {
          // Check the database events: Did we already send this SLA Type at this level to this user?
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const alreadyNotified = ticket.escalations.some(
            (e: any) =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              e.escalationLevel === rule.escalationLevel &&
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              e.slaType === slaType &&
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              e.notifiedUserId === recipient.id,
          );

          if (!alreadyNotified) {
            // 1. Record event cleanly in the DB so it never repeats
            const event = await this.prisma.escalationEvent.create({
              data: {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                ticketId: ticket.id,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                escalationLevel: rule.escalationLevel,
                slaType: slaType, // Using the new DB column
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                notifiedUserId: recipient.id,
              },
            });

            // Push to local array to prevent duplicate triggers in the same execution cycle
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            ticket.escalations.push(event);

            // 2. Queue Email payload with dynamic recipient details
            await this.mailQueue.add(
              JOB_NAMES.SEND_ESCALATION_EMAIL,
              {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                ticketId: ticket.id,
                breachType: slaType,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                notifyEmail: recipient.email,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                notifyName: recipient.firstName || 'IT Lead',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                ruleLevel: rule.escalationLevel,
              },
              {
                attempts: RETRY_CONFIG.ATTEMPTS,
                backoff: {
                  type: RETRY_CONFIG.BACKOFF_TYPE,
                  delay: RETRY_CONFIG.BACKOFF_DELAY,
                },
              },
            );

            this.logger.log(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `Escalation L${rule.escalationLevel} (${slaType}) queued for Ticket ${ticket.id} -> ${recipient.email}`,
            );
          }
        }
      }
    }
  }
}
