import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import { CreateKnownIssueDto } from './create-known-issue.dto';

export class CreateAndAttachDto extends CreateKnownIssueDto {
  @ApiProperty({
    description:
      'Array of ticket IDs to instantly associate upon creation of the known issue',
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  ticketIds!: string[];
}
