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
  email!: string;
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
    example: '123e4567-e89b-12d3-a456-426614174002',
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

  @ApiProperty({ description: 'File size in bytes', example: 1048576 })
  fileSizeBytes: number | undefined;

  @ApiProperty({
    description: 'URL to download or view the file',
    example: 'https://storage.example.com/tickets/abc123/screenshot-error.png',
  })
  fileUrlOrPath: string | undefined;

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

  @ApiPropertyOptional({
    description: 'Download URL (signed URL if using S3)',
    example: 'https://storage.example.com/download/abc123?token=xyz',
  })
  downloadUrl?: string;
}
