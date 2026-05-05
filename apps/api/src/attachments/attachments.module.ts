import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { LocalStorageService } from './storage/local-storage.service';
import { S3StorageService } from './storage/s3-storage.service';
import { IStorageService } from './storage/storage.interface';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { FilesProcessor } from '../queues/files.processor';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BullModule.registerQueue({ name: 'files' }), // Register the queue
  ],
  controllers: [AttachmentsController],
  providers: [
    AttachmentsService,
    FilesProcessor, // Add the processor
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
