import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PriorityLevel } from '@prisma/client';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto';
import { UpdateSlaPolicyDto } from './dto/update-sla-policy.dto';

@Injectable()
export class SlaService {
  // Default fallback values if no policy exists in database
  private readonly defaultPolicies = {
    critical: { ack: 15, resolution: 240 }, // 15 minutes, 4 hours
    high: { ack: 30, resolution: 480 }, // 30 minutes, 8 hours
    medium: { ack: 60, resolution: 1440 }, // 1 hour, 24 hours
    low: { ack: 240, resolution: 2880 }, // 4 hours, 48 hours
  };

  constructor(private readonly prisma: PrismaService) {}

  // ==================== CRUD Operations ====================

  async create(createSlaPolicyDto: CreateSlaPolicyDto) {
    return this.prisma.slaPolicy.create({
      data: createSlaPolicyDto,
    });
  }

  async findAll() {
    return this.prisma.slaPolicy.findMany({
      orderBy: {
        priorityLevel: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const policy = await this.prisma.slaPolicy.findUnique({
      where: { id },
    });

    if (!policy) {
      throw new NotFoundException(`SLA policy with ID ${id} not found`);
    }

    return policy;
  }

  async findByPriority(priorityLevel: PriorityLevel) {
    return this.prisma.slaPolicy.findUnique({
      where: { priorityLevel },
    });
  }

  async update(id: string, updateSlaPolicyDto: UpdateSlaPolicyDto) {
    await this.findOne(id); // Ensure exists

    return this.prisma.slaPolicy.update({
      where: { id },
      data: updateSlaPolicyDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists

    return this.prisma.slaPolicy.delete({
      where: { id },
    });
  }

  // ==================== Core SLA Business Logic ====================

  async getPolicy(priority: PriorityLevel) {
    const policy = await this.findByPriority(priority);
    if (!policy) {
      // Return default values if no policy configured
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const defaults = this.defaultPolicies[priority];
      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        acknowledgementMinutes: defaults.ack,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        resolutionMinutes: defaults.resolution,
      };
    }

    return policy;
  }

  async calculateDeadlines(
    priority: PriorityLevel,
    startDate: Date = new Date(),
  ) {
    const policy = await this.getPolicy(priority);

    return {
      ack: new Date(
        startDate.getTime() + policy.acknowledgementMinutes * 60 * 1000,
      ),
      resolution: new Date(
        startDate.getTime() + policy.resolutionMinutes * 60 * 1000,
      ),
    };
  }

  async calculateDeadlinesWithPause(
    priority: PriorityLevel,
    startDate: Date,
    totalPausedMinutes: number,
  ) {
    const deadlines = await this.calculateDeadlines(priority, startDate);

    // Add paused minutes to deadlines
    return {
      ack: new Date(deadlines.ack.getTime() + totalPausedMinutes * 60 * 1000),
      resolution: new Date(
        deadlines.resolution.getTime() + totalPausedMinutes * 60 * 1000,
      ),
    };
  }

  checkBreaches(ticket: {
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
    slaAckDeadline: Date;
    slaResolutionDeadline: Date;
    status: string;
  }) {
    const now = new Date();

    // Don't check closed or resolved tickets
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      return { ackBreached: false, resolutionBreached: false };
    }

    return {
      ackBreached: !ticket.acknowledgedAt && now > ticket.slaAckDeadline,
      resolutionBreached:
        !ticket.resolvedAt && now > ticket.slaResolutionDeadline,
    };
  }

  async updateBreachStatus(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const { ackBreached, resolutionBreached } = this.checkBreaches(ticket);

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        slaAckBreached: ackBreached,
        slaResolutionBreached: resolutionBreached,
      },
    });
  }

  // ==================== SLA Pause/Resume Logic ====================

  calculatePausedDuration(
    pausedAt: Date,
    resumedAt: Date = new Date(),
  ): number {
    const pausedMilliseconds = resumedAt.getTime() - pausedAt.getTime();
    return Math.floor(pausedMilliseconds / (60 * 1000)); // Convert to minutes
  }

  // ==================== Utility Methods ====================

  getTimeRemaining(deadline: Date): { minutes: number; isBreached: boolean } {
    const now = new Date();
    const minutesRemaining = Math.floor(
      (deadline.getTime() - now.getTime()) / (60 * 1000),
    );
    return {
      minutes: Math.max(0, minutesRemaining),
      isBreached: minutesRemaining < 0,
    };
  }

  formatDeadlineForDisplay(deadline: Date): string {
    return deadline.toLocaleString();
  }
}
