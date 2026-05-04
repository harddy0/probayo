export interface IStorageService {
  save(file: Express.Multer.File, ticketId: string): Promise<string>;
  get(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
  getFileInfo?(filePath: string): Promise<{ size: number; modified: Date }>;
}
