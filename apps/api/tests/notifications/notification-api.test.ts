import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import request from 'supertest';
import { ZodError } from 'zod';

import { createNotificationController } from '../../src/modules/notifications/notification.controller';
import { InMemoryNotificationRepository } from '../../src/modules/notifications/notification.repository';
import { createNotificationRouter } from '../../src/modules/notifications/notification.route';
import { NotificationService } from '../../src/modules/notifications/notification.service';

function createTestApp(authenticated = true) {
  const app = express();
  app.use(express.json());
  const auth: RequestHandler = (_request, response, next) => {
    if (!authenticated) return response.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED' } });
    response.locals.authenticatedUserId = 'user-1'; next();
  };
  const service = new NotificationService(new InMemoryNotificationRepository(), { send: jest.fn() });
  app.use('/notifications', createNotificationRouter(auth, createNotificationController(service)));
  const errors: ErrorRequestHandler = (error, _req, response, _next) => {
    if (error instanceof ZodError) return response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
    response.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  };
  app.use(errors);
  return app;
}

describe('notification API', () => {
  it('registers and unregisters the authenticated user device', async () => {
    const app = createTestApp();
    const body = { pushToken: 'ExpoPushToken[device1]', platform: 'android' };
    expect((await request(app).post('/notifications/devices').send(body)).status).toBe(201);
    expect((await request(app).post('/notifications/devices').send(body)).status).toBe(201);
    expect((await request(app).delete('/notifications/devices').send({ pushToken: body.pushToken })).status).toBe(204);
  });

  it('rejects unauthenticated and invalid registration', async () => {
    expect((await request(createTestApp(false)).post('/notifications/devices').send({ pushToken: 'ExpoPushToken[x]', platform: 'android', userId: 'victim' })).status).toBe(401);
    expect((await request(createTestApp()).post('/notifications/devices').send({ pushToken: 'bad', platform: 'web' })).status).toBe(400);
  });

  it('reads and updates preferences while validating input', async () => {
    const app = createTestApp();
    expect((await request(app).get('/notifications/preferences')).body).toEqual({ safetyAlertsEnabled: false, festivalRemindersEnabled: false });
    expect((await request(app).patch('/notifications/preferences').send({ safetyAlertsEnabled: true })).body.safetyAlertsEnabled).toBe(true);
    expect((await request(app).patch('/notifications/preferences').send({})).status).toBe(400);
    expect((await request(createTestApp(false)).get('/notifications/preferences')).status).toBe(401);
  });
});
