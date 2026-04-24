import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!dwwasdw!';
  }

  getTheString(): string {
    return 'Yeah!';
  }

  getUsers(): Array<{ id: number; name: string }> {
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
      { id: 4, name: 'yahoo' },
      { id: 5, name: 'yahoo1' },
      { id: 6, name: 'yahoo2' },
    ];
  }
}
