import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateTicketCommentDto {
  @ApiProperty({
    description: 'Comment body text',
    example: 'I am experiencing this issue on my laptop as well.',
  })
  @IsString()
  body!: string;

  @ApiPropertyOptional({
    description: 'Whether this comment is internal (IT staff only)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;
}
