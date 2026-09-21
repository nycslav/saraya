import { discoveryQuerySchema } from '@saraya/contracts';

import {
  createDestinationRepository,
  type DestinationRepository,
} from './destination.repository';

export class DestinationService {
  constructor(private readonly repository: DestinationRepository = createDestinationRepository()) {}

  list(rawQuery: unknown) {
    const query = discoveryQuerySchema.parse(rawQuery);
    return this.repository.findAll(query);
  }

  getById(id: string) {
    return this.repository.findById(id);
  }
}
