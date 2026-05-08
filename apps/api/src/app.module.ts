import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import * as Joi from 'joi';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { AssetsModule } from './assets/assets.module';
import { AuthModule } from './auth/auth.module';
import { TicketsModule } from './tickets/tickets.module';
import { SlaModule } from './sla/sla.module';
import { CommentsModule } from './comments/comments.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { QueuesModule } from './queues/queues.module';
import { MailModule } from './mail/mail.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), 'apps/api/.env'),
      ],
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        PORT: Joi.number().required(),
        REDIS_URL: Joi.string().optional(),
        REDIS_HOST: Joi.string().optional(),
        REDIS_PORT: Joi.number().optional(),
        REDIS_USERNAME: Joi.string().optional(),
        REDIS_PASSWORD: Joi.string().optional(),
        RESEND_API_KEY: Joi.string().required(),
        EMAIL_FROM_ADDRESS: Joi.string().email().required(),
        EMAIL_FROM_NAME: Joi.string().required(),
      }),
    }),

    BullModule.forRoot({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      connection: (() => {
        const url = process.env.REDIS_URL;
        if (url) return { url };

        const host = process.env.REDIS_HOST ?? '127.0.0.1';
        const port = process.env.REDIS_PORT
          ? Number(process.env.REDIS_PORT)
          : 6379;
        const conn: any = { host, port };
        if (process.env.REDIS_USERNAME)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          conn.username = process.env.REDIS_USERNAME;
        if (process.env.REDIS_PASSWORD)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          conn.password = process.env.REDIS_PASSWORD;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (process.env.REDIS_DB) conn.db = Number(process.env.REDIS_DB);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return conn;
      })(),
    }),

    BullModule.registerQueue({ name: 'files' }, { name: 'mail' }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),

    ScheduleModule.forRoot(),

    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(
      { name: 'files', adapter: BullMQAdapter },
      { name: 'mail', adapter: BullMQAdapter },
    ),

    PrismaModule,
    UsersModule,
    DepartmentsModule,
    AssetsModule,
    AuthModule,
    TicketsModule,
    SlaModule,
    CommentsModule,
    AttachmentsModule,
    QueuesModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
