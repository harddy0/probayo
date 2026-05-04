// src/attachments/storage/s3-storage.service.ts (NEW)
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { IStorageService } from './storage.interface';

@Injectable()
export class S3StorageService implements IStorageService {
  private s3: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.s3 = new S3Client({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      region: this.configService.get('AWS_REGION'),
      credentials: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = this.configService.get('AWS_S3_BUCKET');
  }

  async save(file: Express.Multer.File, ticketId: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const key = `tickets/${ticketId}/${Date.now()}-${file.originalname}`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.s3.send(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        Body: file.buffer,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        ContentType: file.mimetype,
      }),
    );
    return key; // Return S3 key instead of local path
  }

  async get(key: string): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const response = await this.s3.send(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.s3.send(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
