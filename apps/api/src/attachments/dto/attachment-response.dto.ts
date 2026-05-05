import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UploadedByUserDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({ description: 'Full name', example: 'John Doe' })
  fullName: string | undefined;

  @ApiProperty({ description: 'Email', example: 'john.doe@example.com' })
  email: string | undefined;
}

export class AttachmentResponseDto {
  @ApiProperty({
    description: 'Attachment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({
    description: 'Ticket ID this attachment belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  ticketId: string | undefined;

  @ApiPropertyOptional({
    description: 'Comment ID if attached to a comment',
    nullable: true,
  })
  commentId?: string | null;

  @ApiProperty({
    description: 'Original filename',
    example: 'screenshot-error.png',
  })
  fileName: string | undefined;

  @ApiProperty({
    description: 'MIME type',
    example: 'image/png',
  })
  fileType: string | undefined;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1048576,
  })
  fileSizeBytes: number | undefined;

  @ApiProperty({
    description: 'URL to download or view the file',
    example: '/api/attachments/123/download',
  })
  downloadUrl: string | undefined;

  @ApiProperty({
    description: 'Who uploaded this file',
    type: UploadedByUserDto,
  })
  uploadedBy: UploadedByUserDto | undefined;

  @ApiProperty({
    description: 'When the file was uploaded',
    example: '2024-01-15T08:00:00Z',
  })
  createdAt: Date | undefined;
}
