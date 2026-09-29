import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import request from 'supertest';
import { ZodError } from 'zod';

import { MockWeatherProvider } from '../../src/integrations/weather';
import { createDestinationSafetyController } from '../../src/modules/destination-safety/destination-safety.controller';
import { createDestinationSafetyRouter } from '../../src/modules/destination-safety/destination-safety.route';
import { InMemoryDestinationSafetySubscriptionRepository } from '../../src/modules/destination-safety/destination-safety-subscription.repository';
import { DestinationSafetyService } from '../../src/modules/destination-safety/destination-safety.service';
import { InMemoryDestinationRepository } from '../../src/modules/destinations/destination.repository';
import { InMemorySafetyAlertRepository } from '../../src/modules/safety-alerts/safety-alert.repository';
import { SafetyAlertService } from '../../src/modules/safety-alerts/safety-alert.service';

function createTestApp(authenticated = true) {
  const app = express();
  app.use(express.json());
  const authenticate: RequestHandler = (_request, response, next) => {
    if (!authenticated) {
      response.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED' } });
      return;
    }
    response.locals.authenticatedUserId = 'authenticated-user';
    next();
  };
  const safety = new SafetyAlertService(
    new InMemorySafetyAlertRepository(),
    new MockWeatherProvider(),
    () => new Date('2026-09-28T00:00:00.000Z'),
  );
  const service = new DestinationSafetyService(
    new InMemoryDestinationSafetySubscriptionRepository(),
    new InMemoryDestinationRepository(),
    safety,
    { sendSafetyAlertNotification: jest.fn() },
    () => new Date('2026-09-28T00:00:00.000Z'),
  );
  app.use('/destinations', createDestinationSafetyRouter(
    authenticate,
    createDestinationSafetyController(service),
  ));
  const errors: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
      return;
    }
    response.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  };
  app.use(errors);
  return app;
}

describe('destination safety API', () => {
  it('returns destination conditions without authentication', async () => {
    const response = await request(createTestApp(false)).get('/destinations/cebu-city/conditions');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      destination: expect.objectContaining({ destinationId: 'cebu-city' }),
      weather: expect.objectContaining({ source: expect.objectContaining({ isDemo: true }) }),
      safetyAlerts: expect.any(Array),
    }));
  });

  it('uses only authenticated ownership for subscribe, status, and unsubscribe', async () => {
    const app = createTestApp();
    const path = '/destinations/cebu-city/safety-subscription';
    const rejectedOwnership = await request(app).post(path).send({ userId: 'victim' });
    const created = await request(app).post(path);
    const status = await request(app).get(path).query({ userId: 'victim' });
    const removed = await request(app).delete(path).send({ userId: 'victim' });
    expect(rejectedOwnership.status).toBe(400);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ destinationId: 'cebu-city', subscribed: true });
    expect(status.body.subscribed).toBe(true);
    expect(removed.status).toBe(204);
  });

  it('requires authentication and returns not found for unknown destinations', async () => {
    expect((await request(createTestApp(false)).post(
      '/destinations/cebu-city/safety-subscription',
    )).status).toBe(401);
    const missing = await request(createTestApp()).post('/destinations/missing/safety-subscription');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('DESTINATION_NOT_FOUND');
  });
});
