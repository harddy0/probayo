import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketCommentDto } from './create-comment.dto';

export class UpdateTicketCommentDto extends PartialType(
  CreateTicketCommentDto,
) {}
