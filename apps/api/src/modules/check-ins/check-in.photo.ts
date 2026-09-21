import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { LocalPhotoStorage } from '../../integrations/photo-storage/local-photo-storage';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const storage = new LocalPhotoStorage();

export const receiveCheckInPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      callback(new Error('Use a JPEG, PNG, or WebP image.'));
      return;
    }
    callback(null, true);
  },
}).single('photo');

export async function uploadCheckInPhoto(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    if (!request.file) {
      response.status(400).json({
        error: { code: 'PHOTO_REQUIRED', message: 'Choose an image to upload.' },
      });
      return;
    }
    response.status(201).json({ photoUrl: await storage.save(request.file) });
  } catch (error) {
    next(error);
  }
}
