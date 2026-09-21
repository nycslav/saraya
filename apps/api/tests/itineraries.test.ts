import request from 'supertest';

import { app } from '../src/app';

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
    const response = await request(app).post('/itineraries/generate').send(preferences);

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
    const generated = await request(app).post('/itineraries/generate').send(preferences);
    const saved = await request(app).post('/itineraries').send(generated.body);
    const retrieved = await request(app).get(`/itineraries/${generated.body.id}`);

    expect(saved.status).toBe(201);
    expect(retrieved.status).toBe(200);
    expect(retrieved.body).toEqual(generated.body);
  });

  it('rejects an unavailable destination', async () => {
    const response = await request(app)
      .post('/itineraries/generate')
      .send({ ...preferences, destinationId: 'not-real' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DESTINATION_NOT_FOUND');
  });

  it('rejects invalid trip preferences before generation', async () => {
    const response = await request(app)
      .post('/itineraries/generate')
      .send({ ...preferences, durationDays: 31, interests: [] });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an itinerary whose saved days do not match its preferences', async () => {
    const generated = await request(app).post('/itineraries/generate').send(preferences);
    const response = await request(app)
      .post('/itineraries')
      .send({ ...generated.body, days: generated.body.days.slice(0, 2) });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ITINERARY');
  });

  it('returns a stable response for an unknown saved itinerary', async () => {
    const response = await request(app).get('/itineraries/not-real');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ITINERARY_NOT_FOUND');
  });
});
