import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import request from 'supertest';
import { ZodError } from 'zod';

import { createFestivalReminderController } from '../../src/modules/festival-reminders/festival-reminder.controller';
import { InMemoryFestivalReminderRepository } from '../../src/modules/festival-reminders/festival-reminder.repository';
import { createFestivalReminderRouters } from '../../src/modules/festival-reminders/festival-reminder.route';
import { FestivalReminderService } from '../../src/modules/festival-reminders/festival-reminder.service';
import { InMemoryFestivalRepository } from '../../src/modules/festivals/festival.repository';

function createTestApp() {
  const app = express();
  app.use(express.json());
  const authenticate: RequestHandler = (req, response, next) => {
    const userId = req.header('x-test-user');
    if (!userId) {
      response.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED' } });
      return;
    }
    response.locals.authenticatedUserId = userId;
    next();
  };
  const service = new FestivalReminderService(
    new InMemoryFestivalReminderRepository(),
    new InMemoryFestivalRepository(),
    { sendFestivalReminderNotification: jest.fn() },
    () => new Date('2026-09-20T00:00:00.000Z'),
  );
  const controller = createFestivalReminderController(service);
  const routers = createFestivalReminderRouters(authenticate, controller);
  app.use('/festivals', routers.festivalReminderRouter);
  app.use('/festival-reminders', routers.festivalReminderListRouter);
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

describe('festival reminder API', () => {
  it('creates, retrieves, lists, and idempotently cancels an authenticated reminder', async () => {
    const app = createTestApp();
    const created = await request(app)
      .post('/festivals/masskara/reminder')
      .set('x-test-user', 'user-1')
      .send({ leadDays: 1 });
    const status = await request(app)
      .get('/festivals/masskara/reminder')
      .set('x-test-user', 'user-1');
    const list = await request(app)
      .get('/festival-reminders')
      .set('x-test-user', 'user-1');
    const cancelled = await request(app)
      .delete('/festivals/masskara/reminder')
      .set('x-test-user', 'user-1');
    const cancelledAgain = await request(app)
      .delete('/festivals/masskara/reminder')
      .set('x-test-user', 'user-1');

    expect(created.status).toBe(201);
    expect(created.body).toEqual(expect.objectContaining({ festivalId: 'masskara' }));
    expect(created.body.userId).toBeUndefined();
    expect(status.body.id).toBe(created.body.id);
    expect(list.body).toEqual([expect.objectContaining({ id: created.body.id })]);
    expect(cancelled.status).toBe(204);
    expect(cancelledAgain.status).toBe(204);
  });

  it('fails closed without authenticated server identity', async () => {
    const app = createTestApp();
    expect((await request(app).post('/festivals/masskara/reminder').send({})).status).toBe(401);
    expect((await request(app).get('/festival-reminders')).status).toBe(401);
  });

  it('rejects client ownership and invalid timing', async () => {
    const app = createTestApp();
    const ownership = await request(app)
      .post('/festivals/masskara/reminder')
      .set('x-test-user', 'user-1')
      .send({ leadDays: 1, userId: 'victim' });
    const timing = await request(app)
      .post('/festivals/masskara/reminder')
      .set('x-test-user', 'user-1')
      .send({ leadDays: 2 });
    expect(ownership.status).toBe(400);
    expect(timing.status).toBe(400);
  });

  it('returns established errors for missing and unconfirmed festivals', async () => {
    const app = createTestApp();
    const missing = await request(app)
      .post('/festivals/not-a-festival/reminder')
      .set('x-test-user', 'user-1')
      .send({});
    const recurring = await request(app)
      .post('/festivals/moriones/reminder')
      .set('x-test-user', 'user-1')
      .send({});
    const missingStatus = await request(app)
      .get('/festivals/not-a-festival/reminder')
      .set('x-test-user', 'user-1');
    const missingCancellation = await request(app)
      .delete('/festivals/not-a-festival/reminder')
      .set('x-test-user', 'user-1');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('FESTIVAL_NOT_FOUND');
    expect(recurring.status).toBe(409);
    expect(recurring.body.error.code).toBe('FESTIVAL_REMINDER_UNAVAILABLE');
    expect(missingStatus.status).toBe(404);
    expect(missingCancellation.status).toBe(404);
  });

  it('does not expose or cancel another user reminder', async () => {
    const app = createTestApp();
    await request(app)
      .post('/festivals/masskara/reminder')
      .set('x-test-user', 'user-1')
      .send({});
    expect(
      (await request(app).get('/festivals/masskara/reminder').set('x-test-user', 'user-2'))
        .body,
    ).toBeNull();
    await request(app)
      .delete('/festivals/masskara/reminder')
      .set('x-test-user', 'user-2');
    expect(
      (await request(app).get('/festivals/masskara/reminder').set('x-test-user', 'user-1'))
        .body,
    ).toEqual(expect.objectContaining({ festivalId: 'masskara' }));
  });
});
