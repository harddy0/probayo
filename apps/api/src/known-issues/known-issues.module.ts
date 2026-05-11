import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { KnownIssuesController } from './known-issues.controller';
import { KnownIssuesService } from './known-issues.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [KnownIssuesController],
  providers: [KnownIssuesService],
  exports: [KnownIssuesService],
})
export class KnownIssuesModule {}
