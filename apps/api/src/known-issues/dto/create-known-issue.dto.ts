import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { KnownIssueStatus } from '@prisma/client';

export class CreateKnownIssueDto {
  @ApiProperty({
    description: 'Short title for the known issue',
    example: 'VPN outage across HQ',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    description: 'Detailed description of the known issue',
    example:
      'Multiple employees are reporting VPN disconnects after the latest firewall update.',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    description: 'Status of the known issue',
    enum: KnownIssueStatus,
    default: KnownIssueStatus.Active,
  })
  @IsEnum(KnownIssueStatus)
  @IsOptional()
  status?: KnownIssueStatus;
}
