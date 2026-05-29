import { ApiProperty } from '@nestjs/swagger';
import { PriorityLevel, TicketStatus } from '@prisma/client';

class DepartmentHeadSlaBreachItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string | undefined;

  @ApiProperty({ example: 'VPN disconnects frequently' })
  title: string | undefined;

  @ApiProperty({ enum: PriorityLevel, example: 'high' })
  priority: PriorityLevel | undefined;

  @ApiProperty({ enum: TicketStatus, example: 'open' })
  status: TicketStatus | undefined;

  @ApiProperty({ example: true })
  slaAckBreached: boolean | undefined;

  @ApiProperty({ example: false })
  slaResolutionBreached: boolean | undefined;

  @ApiProperty({ example: '2026-05-20T10:00:00.000Z' })
  slaAckDeadline: Date | undefined;

  @ApiProperty({ example: '2026-05-20T18:00:00.000Z' })
  slaResolutionDeadline: Date | undefined;

  @ApiProperty({ example: '2026-05-19T08:00:00.000Z' })
  createdAt: Date | undefined;
}

export class DepartmentHeadSlaBreachesResponseDto {
  @ApiProperty({ example: '2026-05-19T00:00:00.000Z' })
  rangeStart: Date | undefined;

  @ApiProperty({ example: '2026-05-25T23:59:59.999Z' })
  rangeEnd: Date | undefined;

  @ApiProperty({ example: 3 })
  total: number | undefined;

  @ApiProperty({ type: [DepartmentHeadSlaBreachItemDto] })
  items: DepartmentHeadSlaBreachItemDto[] | undefined;
}
