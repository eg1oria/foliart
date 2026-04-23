declare module 'multer' {
  import type { Request } from 'express';

  export interface MulterFile {
    buffer: Buffer;
    destination: string;
    encoding: string;
    fieldname: string;
    filename: string;
    mimetype: string;
    originalname: string;
    path: string;
    size: number;
  }

  export interface StorageEngine {
    _handleFile?: unknown;
    _removeFile?: unknown;
  }

  export type DestinationCallback = (
    error: Error | null,
    destination: string,
  ) => void;
  export type FilenameCallback = (
    error: Error | null,
    filename: string,
  ) => void;

  export interface DiskStorageOptions {
    destination?:
      | string
      | ((
          req: Request,
          file: MulterFile,
          callback: DestinationCallback,
        ) => void);
    filename?: (
      req: Request,
      file: MulterFile,
      callback: FilenameCallback,
    ) => void;
  }

  export function diskStorage(options: DiskStorageOptions): StorageEngine;
}
