import jwt from 'jsonwebtoken';
import request, { type Test } from 'supertest';

import { app } from '../src/app';

const accessSecret = 'bucket-list-access-secret-at-least-32-characters';
process.env.JWT_ACCESS_SECRET = accessSecret;
process.env.JWT_REFRESH_SECRET = 'bucket-list-refresh-secret-at-least-32-characters';
const accessToken = jwt.sign({ tokenType: 'access' }, accessSecret, {
  algorithm: 'HS256',
  subject: 'bucket-user',
  issuer: 'saraya-api',
  audience: 'saraya-mobile',
  expiresIn: '15m',
});
const authenticated = (test: Test) => test.set('Authorization', `Bearer ${accessToken}`);

describe('bucket-list API', () => {
  it('requires a valid Saraya access token', async () => {
    const response = await request(app).get('/bucket-list');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('supports the complete create, list, update, and delete lifecycle', async () => {
    const created = await authenticated(request(app).post('/bucket-list')).send({
      destinationId: 'siargao',
      priority: 'high',
      personalNotes: 'Book a local surfing lesson.',
    });

    expect(created.status).toBe(201);
    expect(created.body).toEqual(
      expect.objectContaining({
        userId: 'bucket-user',
        destinationId: 'siargao',
        priority: 'high',
        personalNotes: 'Book a local surfing lesson.',
        status: 'planned',
      }),
    );

    const listed = await authenticated(request(app).get('/bucket-list'));
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual([
      expect.objectContaining({ id: created.body.id, destinationId: 'siargao' }),
    ]);

    const updated = await authenticated(
      request(app).patch(`/bucket-list/${created.body.id}`),
    ).send({
      priority: 'medium',
      personalNotes: 'Visit Cloud 9 early in the morning.',
      status: 'visited',
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual(
      expect.objectContaining({
        priority: 'medium',
        personalNotes: 'Visit Cloud 9 early in the morning.',
        status: 'visited',
      }),
    );

    const removed = await authenticated(request(app).delete(`/bucket-list/${created.body.id}`));
    expect(removed.status).toBe(204);
    expect((await authenticated(request(app).get('/bucket-list'))).body).toEqual([]);
  });

  it('prevents duplicate destination saves', async () => {
    const first = await authenticated(request(app).post('/bucket-list'))
      .send({ destinationId: 'vigan' });
    const duplicate = await authenticated(request(app).post('/bucket-list'))
      .send({ destinationId: 'vigan' });

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('BUCKET_LIST_DUPLICATE');

    await authenticated(request(app).delete(`/bucket-list/${first.body.id}`));
  });

  it('lists high-priority destinations before lower-priority destinations', async () => {
    const low = await authenticated(request(app).post('/bucket-list')).send({
      destinationId: 'bohol',
      priority: 'low',
    });
    const high = await authenticated(request(app).post('/bucket-list')).send({
      destinationId: 'coron',
      priority: 'high',
    });

    const listed = await authenticated(request(app).get('/bucket-list'));
    expect(listed.body.map((item: { destinationId: string }) => item.destinationId)).toEqual([
      'coron',
      'bohol',
    ]);

    await Promise.all([
      authenticated(request(app).delete(`/bucket-list/${low.body.id}`)),
      authenticated(request(app).delete(`/bucket-list/${high.body.id}`)),
    ]);
  });

  it('rejects an unavailable destination', async () => {
    const response = await authenticated(request(app).post('/bucket-list'))
      .send({ destinationId: 'not-real' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DESTINATION_NOT_FOUND');
  });

  it('validates priorities, statuses, notes, and empty updates', async () => {
    const invalidCreate = await authenticated(request(app).post('/bucket-list')).send({
      destinationId: 'bohol',
      priority: 'urgent',
      personalNotes: 'x'.repeat(501),
    });
    const emptyUpdate = await authenticated(request(app).patch('/bucket-list/not-real')).send({});

    expect(invalidCreate.status).toBe(400);
    expect(invalidCreate.body.error.code).toBe('VALIDATION_ERROR');
    expect(emptyUpdate.status).toBe(400);
    expect(emptyUpdate.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns a stable response for an unknown item', async () => {
    const [updated, removed] = await Promise.all([
      authenticated(request(app).patch('/bucket-list/not-real')).send({ status: 'skipped' }),
      authenticated(request(app).delete('/bucket-list/not-real')),
    ]);

    expect(updated.status).toBe(404);
    expect(updated.body.error.code).toBe('BUCKET_LIST_ITEM_NOT_FOUND');
    expect(removed.status).toBe(404);
    expect(removed.body.error.code).toBe('BUCKET_LIST_ITEM_NOT_FOUND');
  });
});
