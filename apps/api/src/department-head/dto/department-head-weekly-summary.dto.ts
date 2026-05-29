import { ApiProperty } from '@nestjs/swagger';

class SlaBreachSummaryDto {
  @ApiProperty({ example: 2 })
  acknowledgement: number | undefined;

  @ApiProperty({ example: 3 })
  resolution: number | undefined;

  @ApiProperty({ example: 4 })
  totalTicketsBreached: number | undefined;
}

export class DepartmentHeadWeeklySummaryDto {
  @ApiProperty({ example: '2026-05-19T00:00:00.000Z' })
  rangeStart: Date | undefined;

  @ApiProperty({ example: '2026-05-25T23:59:59.999Z' })
  rangeEnd: Date | undefined;

  @ApiProperty({ example: 42 })
  totalCreated: number | undefined;

  @ApiProperty({
    additionalProperties: { type: 'number' },
    example: { open: 4, resolved: 12 },
  })
  byStatus: Record<string, number> | undefined;

  @ApiProperty({
    additionalProperties: { type: 'number' },
    example: { high: 6, medium: 20 },
  })
  byPriority: Record<string, number> | undefined;

  @ApiProperty({ type: SlaBreachSummaryDto })
  slaBreaches: SlaBreachSummaryDto | undefined;

  @ApiProperty({ example: 180, nullable: true })
  averageResolutionMinutes: number | null | undefined;
}
