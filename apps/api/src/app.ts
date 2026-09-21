import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

import { bucketListRouter } from './modules/bucket-list/bucket-list.route';
import { achievementRouter, userAchievementRouter } from './modules/achievements/achievement.route';
import { checkInRouter } from './modules/check-ins/check-in.route';
import { destinationRouter } from './modules/destinations/destination.route';
import { itineraryRouter } from './modules/itineraries/itinerary.route';
import { uploadRoot } from './integrations/photo-storage/local-photo-storage';

export const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadRoot, { fallthrough: false, index: false }));

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/achievements', achievementRouter);
app.use('/bucket-list', bucketListRouter);
app.use('/check-ins', checkInRouter);
app.use('/destinations', destinationRouter);
app.use('/itineraries', itineraryRouter);
app.use('/user/achievements', userAchievementRouter);

app.use((_request, response) => {
  response.status(404).json({
    error: { code: 'ROUTE_NOT_FOUND', message: 'The requested API route does not exist.' },
  });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid values.',
        issues: error.issues,
      },
    });
    return;
  }

  if (error instanceof multer.MulterError || error?.message === 'Use a JPEG, PNG, or WebP image.') {
    response.status(400).json({
      error: { code: 'INVALID_PHOTO', message: error.message },
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'The server could not complete the request.' },
  });
};

app.use(errorHandler);
