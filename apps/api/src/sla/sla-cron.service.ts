/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

      // Fetch fallback IT users once in case we have unassigned breached tickets
      const fallbackItUsers = await this.prisma.user.findMany({
        where: {
          role: { in: [UserRole.ItStaff, UserRole.Admin] },
          isActive: true,
        },
      });

      // ==========================================
      // PHASE 1: MARK BREACHES & NOTIFY IT STAFF
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
        include: {
          assignedToUser: true, // Need this to know who to email
        },
      });

      for (const ticket of unbreachedTickets) {
        const updates: {
          slaAckBreached?: boolean;
          slaResolutionBreached?: boolean;
        } = {};
        let newlyBreachedAck = false;
        let newlyBreachedRes = false;

        if (
          !ticket.acknowledgedAt &&
          !ticket.slaAckBreached &&
          now > ticket.slaAckDeadline
        ) {
          updates.slaAckBreached = true;
          newlyBreachedAck = true;
        }

        if (
          !ticket.resolvedAt &&
          !ticket.slaResolutionBreached &&
          now > ticket.slaResolutionDeadline
        ) {
          updates.slaResolutionBreached = true;
          newlyBreachedRes = true;
        }

        if (Object.keys(updates).length > 0) {
          await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: updates,
          });

          // Queue Immediate Notification Emails
          if (newlyBreachedAck) {
            await this.queueBreachEmails(
              ticket,
              SlaType.Acknowledgement,
              fallbackItUsers,
            );
          }
          if (newlyBreachedRes) {
            await this.queueBreachEmails(
              ticket,
              SlaType.Resolution,
              fallbackItUsers,
            );
          }
        }
      }

      // ==========================================
      // PHASE 2: PROCESS ESCALATIONS
      // ==========================================
      // ... (Keep existing Phase 2 logic exactly as it is) ...

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
      (r) => r.priorityLevel === ticket.priority && r.slaType === slaType,
    );

    for (const rule of rules) {
      // Calculate exactly when this escalation should fire based on the DB rule
      const triggerTime = new Date(
        deadline.getTime() + rule.triggerAfterMinutes * 60000,
      );

      if (now >= triggerTime) {
        let recipients: any[] = [];

        // Dynamically assign recipients based on the rule
        if (rule.notifyRole === EscalationNotifyRole.Admin) {
          recipients = admins;
        } else if (rule.notifyRole === EscalationNotifyRole.DepartmentHead) {
          if (ticket.department?.headUser) {
            recipients = [ticket.department.headUser];
          }
        }

        for (const recipient of recipients) {
          // Check the database events: Did we already send this SLA Type at this level to this user?
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          const alreadyNotified = ticket.escalations.some(
            (e: any) =>
              e.escalationLevel === rule.escalationLevel &&
              e.slaType === slaType &&
              e.notifiedUserId === recipient.id,
          );

          if (!alreadyNotified) {
            // 1. Record event cleanly in the DB so it never repeats
            const event = await this.prisma.escalationEvent.create({
              data: {
                ticketId: ticket.id,

                escalationLevel: rule.escalationLevel,
                slaType: slaType, // Using the new DB column

                notifiedUserId: recipient.id,
              },
            });

            // Push to local array to prevent duplicate triggers in the same execution cycle
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            ticket.escalations.push(event);

            // 2. Queue Email payload with dynamic recipient details
            await this.mailQueue.add(
              JOB_NAMES.SEND_ESCALATION_EMAIL,
              {
                ticketId: ticket.id,
                breachType: slaType,

                notifyEmail: recipient.email,

                notifyName: recipient.firstName || 'IT Lead',

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
              `Escalation L${rule.escalationLevel} (${slaType}) queued for Ticket ${ticket.id} -> ${recipient.email}`,
            );
          }
        }
      }
    }
  }
  private async queueBreachEmails(
    ticket: any,
    breachType: SlaType,
    fallbackUsers: any[],
  ) {
    // If ticket is assigned, email the assignee. Otherwise, email all IT/Admins.
    const recipients = ticket.assignedToUser
      ? [ticket.assignedToUser]
      : fallbackUsers;

    for (const recipient of recipients) {
      await this.mailQueue.add(
        JOB_NAMES.SEND_BREACH_NOTIFICATION_EMAIL,
        {
          ticketId: ticket.id,
          ticketTitle: ticket.title,
          ticketPriority: ticket.priority,
          breachType: breachType,

          notifyEmail: recipient.email,
          notifyName: recipient.firstName || 'IT Staff',
        },
        {
          attempts: RETRY_CONFIG.ATTEMPTS,
          backoff: {
            type: RETRY_CONFIG.BACKOFF_TYPE,
            delay: RETRY_CONFIG.BACKOFF_DELAY,
          },
        },
      );
    }

    this.logger.log(
      `Breach Notification (${breachType}) queued for Ticket ${ticket.id} -> ${recipients.length} recipients`,
    );
  }
}
