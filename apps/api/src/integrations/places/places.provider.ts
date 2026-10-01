import type { DestinationDetail } from '@saraya/contracts';

import { GeoapifyPlacesProvider } from './geoapify-places.provider';

export interface PlaceCandidate {
  provider: 'geoapify';
  id: string;
  name: string;
  category: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface PlacesProvider {
  findNearby(destination: DestinationDetail): Promise<PlaceCandidate[]>;
}

export class EmptyPlacesProvider implements PlacesProvider {
  async findNearby(): Promise<PlaceCandidate[]> {
    return [];
  }
}

export class ResilientPlacesProvider implements PlacesProvider {
  constructor(
    private readonly primary: PlacesProvider,
    private readonly fallback: PlacesProvider = new EmptyPlacesProvider(),
  ) {}

  async findNearby(destination: DestinationDetail): Promise<PlaceCandidate[]> {
    try {
      return await this.primary.findNearby(destination);
    } catch (error) {
      console.warn('Places lookup failed; continuing without live place candidates.', error);
      return this.fallback.findNearby(destination);
    }
  }
}

export function createPlacesProvider(): PlacesProvider {
  if (process.env.NODE_ENV === 'test' || !process.env.GEOAPIFY_API_KEY) {
    return new EmptyPlacesProvider();
  }

  return new ResilientPlacesProvider(new GeoapifyPlacesProvider());
}
