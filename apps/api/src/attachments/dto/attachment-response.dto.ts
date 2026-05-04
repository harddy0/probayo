import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UploadedByUserDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: 'Full name', example: 'John Doe' })
  fullName: string;

  @ApiProperty({ description: 'Email', example: 'john.doe@example.com' })
  email: string;
}

export class AttachmentResponseDto {
  @ApiProperty({
    description: 'Attachment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Ticket ID this attachment belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  ticketId: string;

  @ApiPropertyOptional({
    description: 'Comment ID if attached to a comment',
    nullable: true,
  })
  commentId?: string | null;

  @ApiProperty({
    description: 'Original filename',
    example: 'screenshot-error.png',
  })
  fileName: string;

  @ApiProperty({
    description: 'MIME type',
    example: 'image/png',
  })
  fileType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1048576,
  })
  fileSizeBytes: number;

  @ApiProperty({
    description: 'URL to download or view the file',
    example: '/api/attachments/123/download',
  })
  downloadUrl: string;

  @ApiProperty({
    description: 'Who uploaded this file',
    type: UploadedByUserDto,
  })
  uploadedBy: UploadedByUserDto;

  @ApiProperty({
    description: 'When the file was uploaded',
    example: '2024-01-15T08:00:00Z',
  })
  createdAt: Date;
}
