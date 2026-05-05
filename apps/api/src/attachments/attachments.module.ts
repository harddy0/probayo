// src/attachments/attachments.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { LocalStorageService } from './storage/local-storage.service';
import { S3StorageService } from './storage/s3-storage.service';
import { IStorageService } from './storage/storage.interface';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AttachmentsController],
  providers: [
    AttachmentsService,
    {
      provide: 'IStorageService',
      useFactory: (configService: ConfigService): IStorageService => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const storageType = configService.get('STORAGE_TYPE', 'local');

        if (storageType === 's3') {
          return new S3StorageService(configService);
        }

        return new LocalStorageService();
      },
      inject: [ConfigService],
    },
  ],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
