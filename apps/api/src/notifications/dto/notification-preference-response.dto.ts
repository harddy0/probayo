import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationPreferenceResponseDto {
  @ApiProperty({
    description: 'Preference ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string | undefined;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.TicketCreated,
  })
  type: NotificationType | undefined;

  @ApiProperty({
    description: 'Whether to receive email notifications for this type',
    example: true,
  })
  email: boolean | undefined;

  @ApiProperty({
    description: 'Whether to receive in-app notifications for this type',
    example: true,
  })
  inApp: boolean | undefined;

  @ApiProperty({
    description: 'When the preference was last updated',
    example: '2024-01-15T08:00:00Z',
  })
  updatedAt: Date | undefined;
}
