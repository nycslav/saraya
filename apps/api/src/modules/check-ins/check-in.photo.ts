import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { getPhotoStorage } from '../../integrations/photo-storage/photo-storage';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
    response.status(201).json({ photoUrl: await getPhotoStorage().save(request.file) });
  } catch (error) {
    next(error);
  }
}

export async function serveCheckInPhoto(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const fileName = request.params.fileName;
    if (typeof fileName !== 'string') {
      response.status(404).json({
        error: { code: 'PHOTO_NOT_FOUND', message: 'The requested travel photo does not exist.' },
      });
      return;
    }

    const photo = await getPhotoStorage().read(fileName);
    response.setHeader('Content-Type', photo.contentType);
    response.setHeader('Cache-Control', 'public, max-age=3600');
    response.send(photo.body);
  } catch (error) {
    next(error);
  }
}
