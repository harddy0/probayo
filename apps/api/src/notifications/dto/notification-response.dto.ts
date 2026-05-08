// src/notifications/dto/notification-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationChannel } from '@prisma/client';

class RecipientUserDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({
    description: 'Full name',
    example: 'John Doe',
  })
  fullName: string | undefined;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  email: string | undefined;
}

class TicketReferenceDto {
  @ApiProperty({
    description: 'Ticket ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({
    description: 'Ticket title',
    example: 'VPN connection keeps dropping',
  })
  title: string | undefined;
}

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({
    description: 'Recipient user information',
    type: RecipientUserDto,
  })
  recipient: RecipientUserDto | undefined;

  @ApiPropertyOptional({
    description: 'Related ticket information',
    type: TicketReferenceDto,
    nullable: true,
  })
  ticket?: TicketReferenceDto | null;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.TicketCreated,
  })
  type: NotificationType | undefined;

  @ApiProperty({
    description: 'Channel for notification delivery',
    enum: NotificationChannel,
    example: NotificationChannel.InApp,
  })
  channel: NotificationChannel | undefined;

  @ApiPropertyOptional({
    description: 'Subject line',
    nullable: true,
  })
  subject?: string | null;

  @ApiProperty({
    description: 'Notification body',
  })
  body: string | undefined;

  @ApiPropertyOptional({
    description: 'When notification was sent/read',
    nullable: true,
  })
  sentAt?: Date | null;

  @ApiProperty({
    description: 'When notification was created',
    example: '2024-01-15T08:00:00Z',
  })
  createdAt: Date | undefined;
}
