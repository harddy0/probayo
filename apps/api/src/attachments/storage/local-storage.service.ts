import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { File as MulterFile } from 'multer';
import { createReadStream, existsSync } from 'fs';
import { Readable } from 'stream';

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir = './uploads';

  constructor() {
    void this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Upload directory created at ${this.uploadDir}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create upload directory: ${message}`);
    }
  }

  async save(file: MulterFile, ticketId: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const filename = `${randomUUID()}-${file.originalname}`;
    const ticketDir = path.join(this.uploadDir, 'tickets', ticketId);

    await fs.mkdir(ticketDir, { recursive: true });

    const filePath = path.join(ticketDir, filename);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await fs.writeFile(filePath, file.buffer);

    this.logger.log(`File saved: ${filePath}`);

    return filePath;
  }

  async get(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      const nodeErr = error as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        throw new NotFoundException(`File not found at path: ${filePath}`);
      }
      throw error;
    }
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.log(`File deleted: ${filePath}`);
    } catch (error) {
      const nodeErr = error as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        this.logger.warn(`File already deleted or not found: ${filePath}`);
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete file: ${filePath}`, message);
      throw error;
    }
  }

  async getFileInfo(
    filePath: string,
  ): Promise<{ size: number; modified: Date }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      const nodeErr = error as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        throw new NotFoundException(`File not found at path: ${filePath}`);
      }
      throw error;
    }
  }
  async getStream(filePath: string): Promise<Readable> {
    if (!existsSync(filePath)) {
      throw new NotFoundException(`File not found at path: ${filePath}`);
    }
    const stream = createReadStream(filePath);
    return stream;
  }
  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      const nodeErr = error as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        throw new NotFoundException(`File not found at path: ${filePath}`);
      }
      throw error;
    }
  }
}
