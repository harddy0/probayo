import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!dwwasdw!';
  }

  getTheString(): string {
    return 'Yeah!';
  }
}
