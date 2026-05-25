// src/notifications/dto/update-notification.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class UpdateNotificationDto {
  @ApiPropertyOptional({
    description: 'Whether the notification has been seen',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isSeen?: boolean;

  @ApiPropertyOptional({
    description: 'Mark notification as sent/read by setting timestamp',
    example: '2024-01-15T08:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  sentAt?: Date;
}
