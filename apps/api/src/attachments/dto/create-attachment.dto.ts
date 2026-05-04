import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateAttachmentDto {
  @ApiProperty({
    description: 'Ticket ID this attachment belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  ticketId!: string;

  @ApiPropertyOptional({
    description:
      'Comment ID if this attachment is attached to a specific comment',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsOptional()
  commentId?: string;

  // Note: file, uploadedByUserId, file metadata are handled by the service
}
