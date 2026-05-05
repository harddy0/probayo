export interface IStorageService {
  save(file: import('multer').File, ticketId: string): Promise<string>;
  get(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
  getFileInfo?(filePath: string): Promise<{ size: number; modified: Date }>;
}
