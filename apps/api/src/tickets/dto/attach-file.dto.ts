// DTO used for Swagger documentation of file upload to ticket
import { ApiProperty } from '@nestjs/swagger';

export class AttachFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File to attach to the ticket',
  })
  file!: any;
}
