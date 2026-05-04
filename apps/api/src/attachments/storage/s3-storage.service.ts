// src/attachments/storage/s3-storage.service.ts (NEW)
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { IStorageService } from './storage.interface';
import type { File as MulterFile } from 'multer';

@Injectable()
export class S3StorageService implements IStorageService {
  private s3: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    const s3Config: S3ClientConfig = {};
    if (region) s3Config.region = region;
    if (accessKeyId && secretAccessKey) {
      // both credentials present — set them
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      s3Config.credentials = { accessKeyId, secretAccessKey } as any;
    }

    this.s3 = new S3Client(s3Config);
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') ?? '';
  }

  async save(file: MulterFile, ticketId: string): Promise<string> {
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
    // Guard against empty body
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!response.Body) {
      throw new Error('Empty response body from S3');
    }

    // If SDK provides transformToByteArray (browser/node unified API), use it
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (typeof (response.Body as any).transformToByteArray === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return Buffer.from(await (response.Body as any).transformToByteArray());
    }

    // Otherwise, assume a NodeJS Readable stream and accumulate
    const stream = response.Body as unknown as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
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
