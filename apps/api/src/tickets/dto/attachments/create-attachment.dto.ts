import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  IsNotEmpty,
  IsUrl,
} from 'class-validator';

// Note: This DTO is for Phase 2 implementation
// The actual file upload will be handled by multer
// This DTO represents the metadata we store after successful upload

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

  @ApiProperty({
    description: 'Original filename',
    example: 'screenshot-error.png',
  })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/png',
  })
  @IsString()
  @IsNotEmpty()
  fileType!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1048576,
  })
  @IsInt()
  @IsNotEmpty()
  fileSizeBytes!: number;

  @ApiProperty({
    description: 'URL or file path where the file is stored',
    example: 'https://storage.example.com/tickets/abc123/screenshot-error.png',
  })
  @IsUrl()
  @IsNotEmpty()
  fileUrlOrPath!: string;

  // Note: uploadedByUserId will be taken from the authenticated user
  // Not included in DTO for security reasons
}
