import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const uploadRoot = path.resolve(process.env.UPLOAD_DIR?.trim() || 'uploads');

export class LocalPhotoStorage {
  async save(file: Express.Multer.File) {
    const extension = extensions[file.mimetype];
    if (!extension) throw new Error('Unsupported image type.');

    const directory = path.join(uploadRoot, 'check-ins');
    await mkdir(directory, { recursive: true });
    const fileName = `${randomUUID()}${extension}`;
    await writeFile(path.join(directory, fileName), file.buffer, { flag: 'wx' });
    return `/uploads/check-ins/${fileName}`;
  }
}
