import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateSlaPolicyDto } from './create-sla-policy.dto';

export class UpdateSlaPolicyDto extends PartialType(CreateSlaPolicyDto) {
  @ApiPropertyOptional({
    description: 'Minutes within which ticket must be acknowledged',
    example: 20,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  acknowledgementMinutes?: number;

  @ApiPropertyOptional({
    description: 'Minutes within which ticket must be resolved',
    example: 300,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  resolutionMinutes?: number;
}
