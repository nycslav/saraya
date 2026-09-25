import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PhotoNotFoundError, type PhotoStorage } from './photo-storage.types';

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export const uploadRoot = path.resolve(process.env.UPLOAD_DIR?.trim() || 'uploads');

export class LocalPhotoStorage implements PhotoStorage {
  async save(file: Express.Multer.File) {
    const extension = extensions[file.mimetype];
    if (!extension) throw new Error('Unsupported image type.');

    const directory = path.join(uploadRoot, 'check-ins');
    await mkdir(directory, { recursive: true });
    const fileName = `${randomUUID()}${extension}`;
    await writeFile(path.join(directory, fileName), file.buffer, { flag: 'wx' });
    return `/uploads/check-ins/${fileName}`;
  }

  async read(fileName: string) {
    const extension = path.extname(fileName).toLowerCase();
    const contentType = mimeTypes[extension];
    if (!contentType || path.basename(fileName) !== fileName) throw new PhotoNotFoundError();

    try {
      return {
        body: await readFile(path.join(uploadRoot, 'check-ins', fileName)),
        contentType,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new PhotoNotFoundError();
      throw error;
    }
  }
}
