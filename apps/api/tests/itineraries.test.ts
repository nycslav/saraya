import request from 'supertest';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { ZodError } from 'zod';

import { app } from '../src/app';
import { createItineraryController } from '../src/modules/itineraries/itinerary.controller';
import { createItineraryRouter } from '../src/modules/itineraries/itinerary.route';
import { ItineraryService } from '../src/modules/itineraries/itinerary.service';

const authenticate: RequestHandler = (_request, response, next) => {
  response.locals.authenticatedUserId = 'itinerary-test-user';
  next();
};
const authenticatedApp = express();
authenticatedApp.use(express.json());
const itineraryController = createItineraryController(new ItineraryService());
authenticatedApp.use('/itineraries', createItineraryRouter(authenticate, itineraryController));
const validationErrors: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
    return;
  }
  response.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
};
authenticatedApp.use(validationErrors);

const otherUserApp = express();
otherUserApp.use(express.json());
otherUserApp.use('/itineraries', createItineraryRouter(
  (_request, response, next) => {
    response.locals.authenticatedUserId = 'other-itinerary-user';
    next();
  },
  itineraryController,
));
otherUserApp.use(validationErrors);

const preferences = {
  destinationId: 'siargao',
  startingPoint: 'Sayak Airport',
  durationDays: 3,
  budget: 'Comfort',
  interests: ['Surfing', 'Local food'],
  pace: 'Balanced',
  accessibilityNeeds: 'Step-free options where possible',
};

describe('itinerary API', () => {
  it('generates a validated itinerary for the requested destination and duration', async () => {
    const response = await request(authenticatedApp).post('/itineraries/generate').send(preferences);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        destinationId: 'siargao',
        generationSource: 'deterministic',
        generatedAt: expect.any(String),
      }),
    );
    expect(response.body.days).toHaveLength(3);
    expect(response.body.days.map((day: { dayNumber: number }) => day.dayNumber)).toEqual([1, 2, 3]);
    expect(response.body.days[0].stops[0].id).toBe('day-1-stop-1');
  });

  it('saves and retrieves a generated itinerary', async () => {
    const generated = await request(authenticatedApp).post('/itineraries/generate').send(preferences);
    const saved = await request(authenticatedApp).post('/itineraries').send(generated.body);
    const listed = await request(authenticatedApp).get('/itineraries');
    const retrieved = await request(authenticatedApp).get(`/itineraries/${generated.body.id}`);

    expect(saved.status).toBe(201);
    expect(listed.status).toBe(200);
    expect(listed.body).toContainEqual(expect.objectContaining({
      id: generated.body.id,
      destinationId: 'siargao',
      durationDays: 3,
      budget: 'Comfort',
    }));
    expect(retrieved.status).toBe(200);
    expect(retrieved.body).toEqual(generated.body);

    const otherList = await request(otherUserApp).get('/itineraries');
    const otherGet = await request(otherUserApp).get(`/itineraries/${generated.body.id}`);
    const otherDelete = await request(otherUserApp).delete(`/itineraries/${generated.body.id}`);
    expect(otherList.body).not.toContainEqual(expect.objectContaining({ id: generated.body.id }));
    expect(otherGet.status).toBe(404);
    expect(otherDelete.status).toBe(404);

    const removed = await request(authenticatedApp).delete(`/itineraries/${generated.body.id}`);
    const afterDelete = await request(authenticatedApp).get(`/itineraries/${generated.body.id}`);

    expect(removed.status).toBe(204);
    expect(afterDelete.status).toBe(404);
  });

  it('rejects an unavailable destination', async () => {
    const response = await request(authenticatedApp)
      .post('/itineraries/generate')
      .send({ ...preferences, destinationId: 'not-real' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DESTINATION_NOT_FOUND');
  });

  it('rejects invalid trip preferences before generation', async () => {
    const response = await request(authenticatedApp)
      .post('/itineraries/generate')
      .send({ ...preferences, durationDays: 31, interests: [] });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an itinerary whose saved days do not match its preferences', async () => {
    const generated = await request(authenticatedApp).post('/itineraries/generate').send(preferences);
    const response = await request(authenticatedApp)
      .post('/itineraries')
      .send({ ...generated.body, days: generated.body.days.slice(0, 2) });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ITINERARY');
  });

  it('returns a stable response for an unknown saved itinerary', async () => {
    const response = await request(authenticatedApp).get('/itineraries/not-real');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ITINERARY_NOT_FOUND');
  });

  it('fails closed when authenticated identity is unavailable', async () => {
    const response = await request(app).post('/itineraries/generate').send(preferences);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });
});
