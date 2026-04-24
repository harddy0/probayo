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

  @Get('users')
  getUsers(): Array<{ id: number; name: string }> {
    return this.appService.getUsers();
  }
}
