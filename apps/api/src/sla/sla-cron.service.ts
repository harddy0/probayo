import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SlaEscalationService } from './sla-escalation.service';

@Injectable()
export class SlaCronService {
  private readonly logger = new Logger(SlaCronService.name);
  private isRunning = false;

  constructor(private readonly slaEscalationService: SlaEscalationService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSlaViolations(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    const startTime = Date.now();

    try {
      const result = await this.slaEscalationService.runSlaCheck();

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `SLA Check Complete: ${result.newBreaches} new breaches marked, ${result.evaluatedEscalations} breached tickets evaluated for escalation (${elapsed}ms)`,
      );
    } catch (error) {
      this.logger.error('SLA violation cron failed:', error);
    } finally {
      this.isRunning = false;
    }
  }
}
