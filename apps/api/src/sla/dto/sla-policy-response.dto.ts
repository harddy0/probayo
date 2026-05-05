import { ApiProperty } from '@nestjs/swagger';
import { PriorityLevel } from '@prisma/client';

export class SlaPolicyResponseDto {
  @ApiProperty({
    description: 'SLA policy ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({
    description: 'Priority level',
    enum: PriorityLevel,
    example: 'critical',
  })
  priorityLevel: PriorityLevel | undefined;

  @ApiProperty({
    description: 'Acknowledgement deadline in minutes',
    example: 15,
  })
  acknowledgementMinutes: number | undefined;

  @ApiProperty({
    description: 'Resolution deadline in minutes',
    example: 240,
  })
  resolutionMinutes: number | undefined;
}
