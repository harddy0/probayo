import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';
import { PriorityLevel } from '@prisma/client';

export class CreateSlaPolicyDto {
  @ApiProperty({
    description: 'Priority level for this SLA policy',
    enum: PriorityLevel,
    example: 'Critical',
  })
  @IsEnum(PriorityLevel)
  @IsNotEmpty()
  priorityLevel!: PriorityLevel;

  @ApiProperty({
    description: 'Minutes within which ticket must be acknowledged',
    example: 15,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  acknowledgementMinutes!: number;

  @ApiProperty({
    description: 'Minutes within which ticket must be resolved',
    example: 240,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  resolutionMinutes!: number;
}
