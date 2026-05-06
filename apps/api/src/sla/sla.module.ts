import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { SlaCronService } from './sla-cron.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule],
  controllers: [SlaController],
  providers: [SlaService, SlaCronService],
  exports: [SlaService],
})
export class SlaModule {}
