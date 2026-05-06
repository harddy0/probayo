import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus } from '@prisma/client';

@Injectable()
export class SlaCronService {
  private readonly logger = new Logger(SlaCronService.name);
  private isRunning = false;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSlaViolations(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Previous SLA violation check still running, skipping this cycle',
      );
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const now = new Date();

      const breachedTickets = await this.prisma.ticket.findMany({
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
        select: {
          id: true,
          acknowledgedAt: true,
          resolvedAt: true,
          slaAckDeadline: true,
          slaResolutionDeadline: true,
          slaAckBreached: true,
          slaResolutionBreached: true,
          status: true,
          priority: true,
          departmentId: true,
        },
      });

      if (breachedTickets.length === 0) {
        return;
      }

      this.logger.log(
        `Found ${breachedTickets.length} tickets with potential SLA violations`,
      );

      let ackBreachCount = 0;
      let resolutionBreachCount = 0;

      for (const ticket of breachedTickets) {
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
          ackBreachCount++;
        }

        if (
          !ticket.resolvedAt &&
          !ticket.slaResolutionBreached &&
          now > ticket.slaResolutionDeadline
        ) {
          updates.slaResolutionBreached = true;
          resolutionBreachCount++;
        }

        if (Object.keys(updates).length === 0) {
          continue;
        }

        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: updates,
        });

        this.logger.log(
          `SLA breach flagged for ticket ${ticket.id}: ${JSON.stringify(updates)}`,
        );
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `SLA violation check complete: ${breachedTickets.length} checked, ` +
          `${ackBreachCount} ack breaches, ${resolutionBreachCount} resolution breaches ` +
          `(${elapsed}ms)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';
      this.logger.error(`SLA violation cron failed: ${message}`, stack);
    } finally {
      this.isRunning = false;
    }
  }
}
