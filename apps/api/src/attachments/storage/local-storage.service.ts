import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.error(`Failed to create upload directory: ${error.message}`);
    }
  }

  async save(file: Express.Multer.File, ticketId: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const filename = `${uuidv4()}-${file.originalname}`;
    const ticketDir = path.join(this.uploadDir, 'tickets', ticketId);

    await fs.mkdir(ticketDir, { recursive: true });

    const filePath = path.join(ticketDir, filename);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await fs.writeFile(filePath, file.buffer);

    this.logger.log(`File saved: ${filePath}`);

    return filePath;
  }

  async get(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.log(`File deleted: ${filePath}`);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.error(`Failed to delete file: ${filePath}`, error.message);
      throw error;
    }
  }

  async getFileInfo(
    filePath: string,
  ): Promise<{ size: number; modified: Date }> {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      modified: stats.mtime,
    };
  }
}
