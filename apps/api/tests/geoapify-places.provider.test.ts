import { GeoapifyPlacesProvider } from '../src/integrations/places/geoapify-places.provider';
import { InMemoryDestinationRepository } from '../src/modules/destinations/destination.repository';

describe('GeoapifyPlacesProvider', () => {
  it('normalizes named places and caches repeated destination lookups', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              place_id: 'restaurant-1',
              name: 'Sample Island Kitchen',
              formatted: 'Tourism Road, General Luna, Siargao',
              categories: ['catering.restaurant.filipino'],
              lat: 9.79,
              lon: 126.16,
            },
          },
          {
            properties: {
              place_id: 'unnamed-1',
              categories: ['tourism.attraction'],
              lat: 9.8,
              lon: 126.17,
            },
          },
        ],
      }),
    });
    const destination = await new InMemoryDestinationRepository().findById('siargao');
    expect(destination).not.toBeNull();

    const provider = new GeoapifyPlacesProvider(
      'test-key',
      fetcher as unknown as typeof fetch,
      () => 1_000,
    );
    const first = await provider.findNearby(destination!);
    const second = await provider.findNearby(destination!);

    expect(first).toEqual([
      {
        provider: 'geoapify',
        id: 'restaurant-1',
        name: 'Sample Island Kitchen',
        category: 'catering restaurant filipino',
        address: 'Tourism Road, General Luna, Siargao',
        coordinates: { latitude: 9.79, longitude: 126.16 },
      },
    ]);
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const requestedUrl = fetcher.mock.calls[0]?.[0] as URL;
    expect(requestedUrl.searchParams.get('filter')).toContain('circle:');
    expect(requestedUrl.searchParams.get('apiKey')).toBe('test-key');
  });
});
