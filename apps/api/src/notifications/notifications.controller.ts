// src/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Param,
  Put,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationPreferenceResponseDto } from './dto/notification-preference-response.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all notifications for the current user',
    type: [NotificationResponseDto],
  })
  findAll(@Request() req: { user: { id: string } }) {
    return this.notificationsService.findAll(req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Returns the number of unread notifications',
  })
  getUnreadCount(@Request() req: { user: { id: string } }) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single notification by ID' })
  @ApiParam({
    name: 'id',
    description: 'Notification UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the notification',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  findOne(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.notificationsService.findOne(id, req.user.id);
  }

  @Put(':id/seen')
  @ApiOperation({ summary: 'Mark a notification as seen' })
  @ApiParam({
    name: 'id',
    description: 'Notification UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as seen',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only mark own notifications',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  markAsSeen(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.notificationsService.markAsSeen(id, req.user.id);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as seen for current user' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as seen',
  })
  markAllAsSeen(@Request() req: { user: { id: string } }) {
    return this.notificationsService.markAllAsSeen(req.user.id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all notification preferences',
    type: [NotificationPreferenceResponseDto],
  })
  getPreferences(@Request() req: { user: { id: string } }) {
    return this.notificationsService.getPreferences(req.user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences for current user' })
  @ApiBody({ type: UpdateNotificationPreferencesDto })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated',
    type: [NotificationPreferenceResponseDto],
  })
  updatePreferences(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(
      req.user.id,
      dto.preferences,
    );
  }
}
