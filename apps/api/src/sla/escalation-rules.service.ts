import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PriorityLevel, SlaType } from '@prisma/client';
import { UpdateEscalationRuleDto } from './dto/update-escalation-rule.dto';

@Injectable()
export class EscalationRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.escalationRule.findMany({
      orderBy: [
        { priorityLevel: 'asc' },
        { slaType: 'asc' },
        { escalationLevel: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.escalationRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Escalation rule ${id} not found`);
    }

    return rule;
  }

  async update(id: string, updateEscalationRuleDto: UpdateEscalationRuleDto) {
    const existing = await this.findOne(id);

    const priorityLevel =
      updateEscalationRuleDto.priorityLevel ?? existing.priorityLevel;
    const slaType = updateEscalationRuleDto.slaType ?? existing.slaType;
    const escalationLevel =
      updateEscalationRuleDto.escalationLevel ?? existing.escalationLevel;
    const triggerAfterMinutes =
      updateEscalationRuleDto.triggerAfterMinutes ??
      existing.triggerAfterMinutes;

    await this.ensureUniqueLevel(priorityLevel, slaType, escalationLevel, id);

    await this.validateLevelMinutes(
      priorityLevel,
      slaType,
      escalationLevel,
      triggerAfterMinutes,
      id,
    );

    return this.prisma.escalationRule.update({
      where: { id },
      data: updateEscalationRuleDto,
    });
  }

  private async ensureUniqueLevel(
    priorityLevel: PriorityLevel,
    slaType: SlaType,
    escalationLevel: number,
    excludeId?: string,
  ) {
    const existing = await this.prisma.escalationRule.findFirst({
      where: {
        priorityLevel,
        slaType,
        escalationLevel,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Escalation level already exists for this priority and SLA type',
      );
    }
  }

  private async validateLevelMinutes(
    priorityLevel: PriorityLevel,
    slaType: SlaType,
    escalationLevel: number,
    triggerAfterMinutes: number,
    excludeId?: string,
  ) {
    const lowerLevel = await this.prisma.escalationRule.findFirst({
      where: {
        priorityLevel,
        slaType,
        escalationLevel: { lt: escalationLevel },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { escalationLevel: 'desc' },
    });

    if (lowerLevel && triggerAfterMinutes < lowerLevel.triggerAfterMinutes) {
      throw new BadRequestException(
        `triggerAfterMinutes must be >= level ${lowerLevel.escalationLevel} minutes (${lowerLevel.triggerAfterMinutes})`,
      );
    }

    const higherLevel = await this.prisma.escalationRule.findFirst({
      where: {
        priorityLevel,
        slaType,
        escalationLevel: { gt: escalationLevel },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { escalationLevel: 'asc' },
    });

    if (higherLevel && triggerAfterMinutes > higherLevel.triggerAfterMinutes) {
      throw new BadRequestException(
        `triggerAfterMinutes must be <= level ${higherLevel.escalationLevel} minutes (${higherLevel.triggerAfterMinutes})`,
      );
    }
  }
}
