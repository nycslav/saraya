import { randomUUID } from 'node:crypto';

import {
  generatedItinerarySchema,
  tripPreferencesSchema,
  type GeneratedItinerary,
} from '@saraya/contracts';

import {
  createDestinationRepository,
  type DestinationRepository,
} from '../destinations/destination.repository';
import {
  createPlacesProvider,
  type PlaceCandidate,
  type PlacesProvider,
} from '../../integrations/places/places.provider';
import {
  createItineraryGenerator,
  type ItineraryGenerator,
} from './itinerary.generator';
import {
  createItineraryRepository,
  type ItineraryRepository,
} from './itinerary.repository';

export class ItineraryDestinationNotFoundError extends Error {}
export class InvalidGeneratedItineraryError extends Error {}

export class ItineraryService {
  constructor(
    private readonly destinations: DestinationRepository = createDestinationRepository(),
    private readonly generator: ItineraryGenerator = createItineraryGenerator(),
    private readonly itineraries: ItineraryRepository = createItineraryRepository(),
    private readonly places: PlacesProvider = createPlacesProvider(),
  ) {}

  async generate(rawPreferences: unknown): Promise<GeneratedItinerary> {
    const preferences = tripPreferencesSchema.parse(rawPreferences);
    const destination = await this.destinations.findById(preferences.destinationId);
    if (!destination) {
      throw new ItineraryDestinationNotFoundError('Destination not found.');
    }

    const candidates = await this.places.findNearby(destination);
    const { plan, source } = await this.generator.generate(preferences, destination, candidates);
    if (!hasExpectedDays(plan.days, preferences.durationDays)) {
      throw new InvalidGeneratedItineraryError(
        'The generated itinerary did not contain the requested sequential days.',
      );
    }

    return generatedItinerarySchema.parse({
      id: randomUUID(),
      destinationId: destination.id,
      generationSource: source,
      title: plan.title,
      subtitle: plan.subtitle,
      preferences,
      days: plan.days.map((day) => ({
        ...day,
        stops: day.stops.map((stop, index) => {
          const place = resolvePlace(stop.candidateId, candidates);
          return {
            id: `day-${day.dayNumber}-stop-${index + 1}`,
            time: stop.time,
            title: place?.name ?? stop.title,
            detail: place ? `${stop.detail} Address: ${place.address}` : stop.detail,
            kind: stop.kind,
            ...(place ? { place } : {}),
          };
        }),
      })),
      generatedAt: new Date().toISOString(),
    });
  }

  async save(rawItinerary: unknown): Promise<GeneratedItinerary> {
    const itinerary = generatedItinerarySchema.parse(rawItinerary);
    if (itinerary.destinationId !== itinerary.preferences.destinationId) {
      throw new InvalidGeneratedItineraryError(
        'The itinerary destination must match its saved preferences.',
      );
    }
    if (!hasExpectedDays(itinerary.days, itinerary.preferences.durationDays)) {
      throw new InvalidGeneratedItineraryError(
        'The itinerary must contain the requested sequential days.',
      );
    }

    const stopIds = itinerary.days.flatMap((day) => day.stops.map((stop) => stop.id));
    if (new Set(stopIds).size !== stopIds.length) {
      throw new InvalidGeneratedItineraryError('Itinerary stop IDs must be unique.');
    }

    await this.itineraries.save(itinerary);
    return itinerary;
  }

  getById(id: string) {
    return this.itineraries.findById(id);
  }
}

function resolvePlace(candidateId: string | null, candidates: PlaceCandidate[]) {
  if (!candidateId) {
    return undefined;
  }

  const candidate = candidates.find(({ id }) => id === candidateId);
  if (!candidate) {
    throw new InvalidGeneratedItineraryError(
      `The generated itinerary referenced an unknown place candidate: ${candidateId}`,
    );
  }

  return candidate;
}

function hasExpectedDays(days: Array<{ dayNumber: number }>, durationDays: number) {
  return (
    days.length === durationDays &&
    days.every((day, index) => day.dayNumber === index + 1)
  );
}
