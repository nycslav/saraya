import { Router } from 'express';

import {
  createBucketItem,
  deleteBucketItem,
  listBucketItems,
  updateBucketItem,
} from './bucket-list.controller';

export const bucketListRouter = Router();

bucketListRouter.get('/', listBucketItems);
bucketListRouter.post('/', createBucketItem);
bucketListRouter.patch('/:id', updateBucketItem);
bucketListRouter.delete('/:id', deleteBucketItem);
