import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment body text',
    example: 'I am experiencing this issue on my laptop as well.',
  })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({
    description: 'Whether this comment is internal (IT staff only)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;

  @ApiProperty({
    description: 'Ticket ID this comment belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  ticketId!: string;
}
