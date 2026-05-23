import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { EscalationNotifyRole, PriorityLevel, SlaType } from '@prisma/client';

export class UpdateEscalationRuleDto {
  @ApiPropertyOptional({
    description: 'Priority level this escalation rule applies to',
    enum: PriorityLevel,
    example: 'Critical',
  })
  @IsEnum(PriorityLevel)
  @IsOptional()
  priorityLevel?: PriorityLevel;

  @ApiPropertyOptional({
    description: 'Which SLA type this rule applies to',
    enum: SlaType,
    example: 'Acknowledgement',
  })
  @IsEnum(SlaType)
  @IsOptional()
  slaType?: SlaType;

  @ApiPropertyOptional({
    description:
      'Escalation level (step order) for the same priority and SLA type',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  escalationLevel?: number;

  @ApiPropertyOptional({
    description:
      'Minutes after the SLA deadline to trigger this escalation level. Must be non-decreasing as escalationLevel increases.',
    example: 30,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  triggerAfterMinutes?: number;

  @ApiPropertyOptional({
    description: 'Who should be notified at this escalation level',
    enum: EscalationNotifyRole,
    example: 'DepartmentHead',
  })
  @IsEnum(EscalationNotifyRole)
  @IsOptional()
  notifyRole?: EscalationNotifyRole;
}
