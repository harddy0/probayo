// src/tickets/tickets.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SlaModule } from '../sla/sla.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommentsModule } from '../comments/comments.module';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { CategoriesService } from './categories/categories.service';
import { CategoriesController } from './categories/categories.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => SlaModule),
    NotificationsModule,
    CommentsModule,
  ],
  controllers: [TicketsController, CategoriesController],
  providers: [TicketsService, CategoriesService],
  exports: [TicketsService],
})
export class TicketsModule {}
