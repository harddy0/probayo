import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { SlaCronService } from './sla-cron.service';
import { SlaEscalationService } from './sla-escalation.service';
import { EscalationRulesController } from './escalation-rules.controller';
import { EscalationRulesService } from './escalation-rules.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QUEUE_NAMES } from '../queues/constants/queue.constants';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MAIL }),
  ],
  controllers: [SlaController, EscalationRulesController],
  providers: [
    SlaService,
    SlaCronService,
    SlaEscalationService,
    EscalationRulesService,
  ],
  exports: [SlaService],
})
export class SlaModule {}
