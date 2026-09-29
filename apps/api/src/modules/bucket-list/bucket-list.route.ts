import { Router } from 'express';

import { requireAuthenticatedUser } from '../../platform/http/auth.middleware';

import {
  createBucketItem,
  deleteBucketItem,
  listBucketItems,
  updateBucketItem,
} from './bucket-list.controller';

export const bucketListRouter = Router();

bucketListRouter.use(requireAuthenticatedUser);
bucketListRouter.get('/', listBucketItems);
bucketListRouter.post('/', createBucketItem);
bucketListRouter.patch('/:id', updateBucketItem);
bucketListRouter.delete('/:id', deleteBucketItem);
