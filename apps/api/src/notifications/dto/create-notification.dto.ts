// src/notifications/dto/create-notification.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { NotificationType, NotificationChannel } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'User ID of the recipient',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  recipientUserId!: string;

  @ApiPropertyOptional({
    description: 'Ticket ID if notification is related to a ticket',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsOptional()
  ticketId?: string;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.TicketCreated,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type!: NotificationType;

  @ApiProperty({
    description: 'Channel for notification delivery',
    enum: NotificationChannel,
    example: NotificationChannel.InApp,
  })
  @IsEnum(NotificationChannel)
  @IsNotEmpty()
  channel!: NotificationChannel;

  @ApiPropertyOptional({
    description: 'Subject line for the notification',
    example: 'New Ticket Created: VPN Issue',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  subject?: string;

  @ApiProperty({
    description: 'Notification body content',
    example:
      'A new ticket has been created by John Doe regarding VPN connectivity issues.',
  })
  @IsString()
  @IsNotEmpty()
  body!: string;
}
