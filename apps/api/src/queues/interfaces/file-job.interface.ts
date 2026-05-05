export interface SerializedBuffer {
  type: 'Buffer';
  data: number[];
}

export interface FileJobData {
  ticketId: string;
  userId: string;
  commentId: string | null;
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    buffer: Buffer | SerializedBuffer | number[] | any;
  };
}

export interface FileJobResult {
  success: boolean;
  attachmentId?: string;
  filePath?: string;
  error?: string;
}
