import { ApiProperty } from '@nestjs/swagger';
import { PriorityLevel } from '@prisma/client';

class DepartmentHeadResolutionPriorityDto {
  @ApiProperty({ enum: PriorityLevel, example: 'high' })
  priority: PriorityLevel | undefined;

  @ApiProperty({ example: 4 })
  resolvedCount: number | undefined;

  @ApiProperty({ example: 120, nullable: true })
  averageMinutes: number | null | undefined;

  @ApiProperty({ example: 90, nullable: true })
  medianMinutes: number | null | undefined;

  @ApiProperty({ example: 240, nullable: true })
  maxMinutes: number | null | undefined;
}

export class DepartmentHeadResolutionMetricsDto {
  @ApiProperty({ example: '2026-05-19T00:00:00.000Z' })
  rangeStart: Date | undefined;

  @ApiProperty({ example: '2026-05-25T23:59:59.999Z' })
  rangeEnd: Date | undefined;

  @ApiProperty({ example: 10 })
  resolvedCount: number | undefined;

  @ApiProperty({ example: 180, nullable: true })
  averageMinutes: number | null | undefined;

  @ApiProperty({ example: 150, nullable: true })
  medianMinutes: number | null | undefined;

  @ApiProperty({ example: 360, nullable: true })
  maxMinutes: number | null | undefined;

  @ApiProperty({ type: [DepartmentHeadResolutionPriorityDto] })
  byPriority: DepartmentHeadResolutionPriorityDto[] | undefined;
}
