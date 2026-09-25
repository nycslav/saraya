import { festivalIdParamsSchema, festivalQuerySchema } from '@saraya/contracts';

import {
  createFestivalRepository,
  type FestivalRepository,
} from './festival.repository';

export class FestivalService {
  constructor(
    private readonly repository: FestivalRepository = createFestivalRepository(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(rawQuery: unknown) {
    return this.repository.findAll(festivalQuerySchema.parse(rawQuery));
  }

  upcoming(rawQuery: unknown) {
    const query = festivalQuerySchema.parse(rawQuery);
    return this.repository.findUpcoming(query, this.now().getMonth() + 1);
  }

  getById(rawId: unknown) {
    const { id } = festivalIdParamsSchema.parse({ id: rawId });
    return this.repository.findById(id);
  }
}
