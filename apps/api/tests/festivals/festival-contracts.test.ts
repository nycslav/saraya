import {
  festivalDetailWithCultureSchema,
  festivalQuerySchema,
} from '@saraya/contracts';

import { seedFestivals } from '../../src/modules/festivals/festival.seed';

describe('festival contracts', () => {
  it('accepts the canonical lossless festival detail payload', () => {
    expect(festivalDetailWithCultureSchema.parse(seedFestivals[0])).toEqual(seedFestivals[0]);
  });

  it('rejects invalid schedule truth and missing cultural content', () => {
    const festival = seedFestivals[0]!;
    expect(() =>
      festivalDetailWithCultureSchema.parse({
        ...festival,
        occurrence: {
          ...festival.occurrence,
          scheduleStatus: 'recurring',
          confirmedStartDate: '2026-01-01',
        },
      }),
    ).toThrow();
    expect(() =>
      festivalDetailWithCultureSchema.parse({ ...festival, culturalGuide: undefined }),
    ).toThrow();
  });

  it('coerces valid HTTP month values and rejects malformed filters', () => {
    expect(festivalQuerySchema.parse({ month: '10', search: ' MassKara ' })).toEqual({
      month: 10,
      search: 'MassKara',
    });
    expect(() => festivalQuerySchema.parse({ month: 'October' })).toThrow();
    expect(() => festivalQuerySchema.parse({ month: 13 })).toThrow();
  });
});
