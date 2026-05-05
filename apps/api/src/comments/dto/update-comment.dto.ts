import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { CreateCommentDto } from './create-comment.dto';

export class UpdateCommentDto extends PartialType(CreateCommentDto) {
  @ApiPropertyOptional({
    description: 'Updated comment body',
    example: 'I am experiencing this issue on my laptop as well. Please help!',
  })
  @IsString()
  @IsOptional()
  body?: string;
}
