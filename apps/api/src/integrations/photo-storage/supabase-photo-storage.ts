import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { PhotoNotFoundError, type PhotoStorage } from './photo-storage.types';

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export class SupabasePhotoStorage implements PhotoStorage {
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly bucket: string;

  constructor() {
    this.baseUrl = requireEnvironmentVariable('SUPABASE_URL').replace(/\/$/, '');
    this.serviceRoleKey = requireEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY');
    this.bucket = requireEnvironmentVariable('PHOTO_STORAGE_BUCKET');
  }

  async save(file: Express.Multer.File) {
    const extension = extensions[file.mimetype];
    if (!extension) throw new Error('Unsupported image type.');

    const fileName = `${randomUUID()}${extension}`;
    const response = await fetch(this.objectUrl(fileName), {
      method: 'POST',
      headers: {
        ...this.authorizationHeaders(),
        'content-type': file.mimetype,
        'x-upsert': 'false',
      },
      body: new Uint8Array(file.buffer),
    });

    if (!response.ok) {
      throw new Error(`Supabase photo upload failed (${response.status}): ${await response.text()}`);
    }

    return `/uploads/check-ins/${fileName}`;
  }

  async read(fileName: string) {
    const extension = path.extname(fileName).toLowerCase();
    const contentType = Object.entries(extensions)
      .find(([, value]) => value === extension)?.[0];
    if (!contentType || path.basename(fileName) !== fileName) throw new PhotoNotFoundError();

    const response = await fetch(this.objectUrl(fileName, true), {
      headers: this.authorizationHeaders(),
    });
    if (response.status === 404) throw new PhotoNotFoundError();
    if (!response.ok) {
      throw new Error(`Supabase photo download failed (${response.status}): ${await response.text()}`);
    }

    return {
      body: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? contentType,
    };
  }

  private objectUrl(fileName: string, authenticated = false) {
    const route = authenticated ? 'authenticated' : '';
    const segments = [this.bucket, 'check-ins', fileName].map(encodeURIComponent).join('/');
    return `${this.baseUrl}/storage/v1/object/${route ? `${route}/` : ''}${segments}`;
  }

  private authorizationHeaders() {
    return {
      apikey: this.serviceRoleKey,
      authorization: `Bearer ${this.serviceRoleKey}`,
    };
  }
}

function requireEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when PHOTO_STORAGE_PROVIDER=supabase.`);
  return value;
}
