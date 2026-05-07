import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { SlaCronService } from './sla-cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QUEUE_NAMES } from '../queues/constants/queue.constants';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MAIL }),
  ],
  controllers: [SlaController],
  providers: [SlaService, SlaCronService],
  exports: [SlaService],
})
export class SlaModule {}
