export interface StoredPhoto {
  body: Buffer;
  contentType: string;
}

export interface PhotoStorage {
  save(file: Express.Multer.File): Promise<string>;
  read(fileName: string): Promise<StoredPhoto>;
  delete(fileName: string): Promise<void>;
}

export class PhotoNotFoundError extends Error {}
