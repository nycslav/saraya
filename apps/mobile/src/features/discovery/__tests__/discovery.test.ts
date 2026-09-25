import type { DestinationDetail, DestinationSummary } from '@saraya/contracts';

import { ApiDestinationGateway } from '../gateways';
import { groupDestinations } from '../screens/DiscoverScreen';

const summary: DestinationSummary = {
  id: 'batanes',
  name: 'Batanes',
  province: 'Batanes',
  region: 'Cagayan Valley',
  islandGroup: 'Luzon',
  category: 'Nature',
  rating: 4.9,
  summary: 'Rolling hills and Ivatan heritage.',
  thumbnailImageUrl: 'https://example.com/destination-images/batanes.webp',
  heroTone: 'forest',
  tags: ['Nature', 'Heritage'],
};

const detail: DestinationDetail = {
  ...summary,
  description: 'A northern island destination shaped by Ivatan culture.',
  highlights: ['Marlboro Hills'],
  bestFor: ['Culture'],
  coordinates: { latitude: 20.4487, longitude: 121.9702 },
  culturalGuide: {
    historicalContext: 'Ivatan communities adapted their homes and traditions to the islands.',
    etiquette: ['Ask before photographing residents.'],
    localPhrase: 'Dios mamajes',
  },
};

describe('destination API gateway', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.saraya.test';
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });

  it('loads and validates destination results from the API', async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => [summary],
    } as Response);

    const results = await new ApiDestinationGateway().list({ search: 'Batanes', islandGroup: 'Luzon' });

    expect(results).toEqual([summary]);
    expect(results[0]?.thumbnailImageUrl).toContain('/destination-images/batanes.webp');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.saraya.test/destinations?search=Batanes&islandGroup=Luzon',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
  });

  it('loads and validates a destination detail from the API', async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => detail,
    } as Response);

    await expect(new ApiDestinationGateway().getById('batanes')).resolves.toEqual(detail);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.saraya.test/destinations/batanes',
      expect.any(Object),
    );
  });

  it('requires an API URL instead of falling back to local data', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;

    expect(() => new ApiDestinationGateway().list({ search: '' })).toThrow(
      'EXPO_PUBLIC_API_BASE_URL is required',
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe('destination region feed', () => {
  it('keeps the island-group order and sorts each section by rating then name', () => {
    const results = groupDestinations([
      { ...summary, id: 'cebu', name: 'Cebu', province: 'Cebu', region: 'Central Visayas', islandGroup: 'Visayas', rating: 4.7 },
      { ...summary, id: 'sagada', name: 'Sagada', province: 'Mountain Province', region: 'Cordillera', rating: 4.9 },
      { ...summary, id: 'siargao', name: 'Siargao', province: 'Surigao del Norte', region: 'Caraga', islandGroup: 'Mindanao', rating: 4.8 },
      summary,
    ]);

    expect(Object.keys(results)).toEqual(['Luzon', 'Visayas', 'Mindanao']);
    expect(results.Luzon.map((destination) => destination.name)).toEqual(['Batanes', 'Sagada']);
    expect(results.Visayas.map((destination) => destination.name)).toEqual(['Cebu']);
    expect(results.Mindanao.map((destination) => destination.name)).toEqual(['Siargao']);
  });
});
