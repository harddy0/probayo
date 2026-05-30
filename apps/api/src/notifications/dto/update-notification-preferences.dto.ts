import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '@prisma/client';

class PreferenceEntryDto {
  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.TicketCreated,
  })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({
    description: 'Whether to enable email notifications for this type',
    example: true,
  })
  @IsBoolean()
  email!: boolean;

  @ApiProperty({
    description: 'Whether to enable in-app notifications for this type',
    example: true,
  })
  @IsBoolean()
  inApp!: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    description: 'Array of notification preferences to update',
    type: [PreferenceEntryDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreferenceEntryDto)
  preferences!: PreferenceEntryDto[];
}
