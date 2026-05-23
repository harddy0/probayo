import { ApiProperty } from '@nestjs/swagger';
import { EscalationNotifyRole, PriorityLevel, SlaType } from '@prisma/client';

export class EscalationRuleResponseDto {
  @ApiProperty({
    description: 'Escalation rule ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({
    description: 'Priority level this escalation rule applies to',
    enum: PriorityLevel,
    example: 'Critical',
  })
  priorityLevel: PriorityLevel | undefined;

  @ApiProperty({
    description: 'Which SLA type this rule applies to',
    enum: SlaType,
    example: 'Acknowledgement',
  })
  slaType: SlaType | undefined;

  @ApiProperty({
    description:
      'Escalation level (step order) for the same priority and SLA type',
    example: 1,
  })
  escalationLevel: number | undefined;

  @ApiProperty({
    description:
      'Minutes after the SLA deadline to trigger this escalation level',
    example: 15,
  })
  triggerAfterMinutes: number | undefined;

  @ApiProperty({
    description: 'Who should be notified at this escalation level',
    enum: EscalationNotifyRole,
    example: 'Admin',
  })
  notifyRole: EscalationNotifyRole | undefined;
}
