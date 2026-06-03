import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('kuhaa')
  getTheString(): string {
    return this.appService.getTheString();
  }

  /**
   * Lightweight liveness probe for Docker HEALTHCHECK.
   * No database, Redis or any other dependency required.
   */
  @Get('health/live')
  getLiveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
