import type { NextFunction, Request, Response } from 'express';

import {
  BucketListDestinationNotFoundError,
  BucketListDuplicateError,
  BucketListItemNotFoundError,
} from './bucket-list.errors';
import { BucketListService } from './bucket-list.service';

const bucketListService = new BucketListService();

export async function listBucketItems(_request: Request, response: Response, next: NextFunction) {
  try {
    response.json(await bucketListService.list(response.locals.authenticatedUserId));
  } catch (error) {
    next(error);
  }
}

export async function createBucketItem(request: Request, response: Response, next: NextFunction) {
  try {
    response.status(201).json(
      await bucketListService.create(response.locals.authenticatedUserId, request.body),
    );
  } catch (error) {
    if (error instanceof BucketListDestinationNotFoundError) {
      response.status(404).json({
        error: { code: 'DESTINATION_NOT_FOUND', message: error.message },
      });
      return;
    }
    if (error instanceof BucketListDuplicateError) {
      response.status(409).json({
        error: { code: 'BUCKET_LIST_DUPLICATE', message: error.message },
      });
      return;
    }
    next(error);
  }
}

export async function updateBucketItem(request: Request, response: Response, next: NextFunction) {
  try {
    response.json(
      await bucketListService.update(
        response.locals.authenticatedUserId,
        getRequestId(request),
        request.body,
      ),
    );
  } catch (error) {
    handleNotFound(error, response, next);
  }
}

export async function deleteBucketItem(request: Request, response: Response, next: NextFunction) {
  try {
    await bucketListService.delete(response.locals.authenticatedUserId, getRequestId(request));
    response.status(204).send();
  } catch (error) {
    handleNotFound(error, response, next);
  }
}

function getRequestId(request: Request) {
  const rawId = request.params.id;
  return Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
}

function handleNotFound(error: unknown, response: Response, next: NextFunction) {
  if (error instanceof BucketListItemNotFoundError) {
    response.status(404).json({
      error: { code: 'BUCKET_LIST_ITEM_NOT_FOUND', message: error.message },
    });
    return;
  }
  next(error);
}
