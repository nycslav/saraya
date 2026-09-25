import { PostgresDestinationRepository } from '../src/modules/destinations/destination.postgres-repository';

const mockQuery = jest.fn();

jest.mock('../src/platform/database/pool', () => ({
  getPool: () => ({ query: mockQuery }),
}));

describe('PostgresDestinationRepository', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('maps complete destination details and keeps canonical coordinates', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 'baguio',
          name: 'Baguio',
          province: 'Benguet',
          region: 'Cordillera Administrative Region',
          island_group: 'Luzon',
          category: 'Culture',
          rating: '4.8',
          summary: 'First sentence. Second sentence.',
          thumbnail_image_url: 'https://example.com/baguio.webp',
          hero_tone: 'forest',
          tags: ['Arts', 'Food', 'Mountains'],
          latitude: '16.4023',
          longitude: '120.596',
          description: 'A mountain city.',
          highlights: ['Burnham Park'],
          best_for: ['Food'],
          historical_context: 'A highland city with a layered history.',
          etiquette: ['Respect local communities.'],
          local_phrase: 'Naimbag nga aldaw.',
        },
      ],
    });

    const repository = new PostgresDestinationRepository();
    const result = await repository.findById('baguio');

    expect(result).toEqual(expect.objectContaining({
      id: 'baguio', rating: 4.8,
      thumbnailImageUrl: 'https://example.com/baguio.webp',
      coordinates: { latitude: 16.4023, longitude: 120.596 },
    }));
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ST_Y(location::geometry)'),
      ['baguio'],
    );
  });
});
