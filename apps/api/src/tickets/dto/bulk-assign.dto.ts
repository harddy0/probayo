import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayNotEmpty, IsNotEmpty } from 'class-validator';

export class BulkAssignDto {
  @ApiProperty({
    description: 'Array of ticket IDs to assign',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ticketIds!: string[];

  @ApiProperty({
    description: 'User ID to assign tickets to',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  @IsNotEmpty()
  assignToUserId!: string;
}
