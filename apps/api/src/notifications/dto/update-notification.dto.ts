// src/notifications/dto/update-notification.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class UpdateNotificationDto {
  @ApiPropertyOptional({
    description: 'Mark notification as sent/read by setting timestamp',
    example: '2024-01-15T08:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  sentAt?: Date;
}
