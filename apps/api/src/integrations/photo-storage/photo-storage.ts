import '../../platform/config/load-env';

import { LocalPhotoStorage } from './local-photo-storage';
import { SupabasePhotoStorage } from './supabase-photo-storage';
import type { PhotoStorage } from './photo-storage.types';

let photoStorage: PhotoStorage | undefined;

export function getPhotoStorage(): PhotoStorage {
  if (photoStorage) return photoStorage;

  const provider = process.env.NODE_ENV === 'test'
    ? 'local'
    : process.env.PHOTO_STORAGE_PROVIDER?.trim().toLowerCase() || 'local';

  if (provider === 'local') {
    photoStorage = new LocalPhotoStorage();
    return photoStorage;
  }

  if (provider === 'supabase') {
    photoStorage = new SupabasePhotoStorage();
    return photoStorage;
  }

  throw new Error(`Unsupported PHOTO_STORAGE_PROVIDER: ${provider}`);
}
