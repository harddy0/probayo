import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class BulkAttachIssueDto {
  @ApiProperty({
    description: 'Array of ticket IDs to attach to a known issue',
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  ticketIds!: string[];

  @ApiProperty({
    description: 'Known issue ID to attach the tickets to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  knownIssueId!: string;
}
