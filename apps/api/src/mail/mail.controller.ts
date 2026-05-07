import { Controller } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}
  // All boilerplate CRUD (create, findAll, findOne, update, remove) has been removed.
  // This service is used internally by the MailProcessor and does not need public endpoints.
}
