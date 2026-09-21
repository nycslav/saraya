import request from 'supertest';

import { app } from '../src/app';

describe('bucket-list API', () => {
  it('supports the complete create, list, update, and delete lifecycle', async () => {
    const created = await request(app).post('/bucket-list').send({
      destinationId: 'siargao',
      priority: 'high',
      personalNotes: 'Book a local surfing lesson.',
    });

    expect(created.status).toBe(201);
    expect(created.body).toEqual(
      expect.objectContaining({
        userId: 'demo-user',
        destinationId: 'siargao',
        priority: 'high',
        personalNotes: 'Book a local surfing lesson.',
        status: 'planned',
      }),
    );

    const listed = await request(app).get('/bucket-list');
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual([
      expect.objectContaining({ id: created.body.id, destinationId: 'siargao' }),
    ]);

    const updated = await request(app).patch(`/bucket-list/${created.body.id}`).send({
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

    const removed = await request(app).delete(`/bucket-list/${created.body.id}`);
    expect(removed.status).toBe(204);
    expect((await request(app).get('/bucket-list')).body).toEqual([]);
  });

  it('prevents duplicate destination saves', async () => {
    const first = await request(app).post('/bucket-list').send({ destinationId: 'vigan' });
    const duplicate = await request(app).post('/bucket-list').send({ destinationId: 'vigan' });

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('BUCKET_LIST_DUPLICATE');

    await request(app).delete(`/bucket-list/${first.body.id}`);
  });

  it('lists high-priority destinations before lower-priority destinations', async () => {
    const low = await request(app).post('/bucket-list').send({
      destinationId: 'bohol',
      priority: 'low',
    });
    const high = await request(app).post('/bucket-list').send({
      destinationId: 'coron',
      priority: 'high',
    });

    const listed = await request(app).get('/bucket-list');
    expect(listed.body.map((item: { destinationId: string }) => item.destinationId)).toEqual([
      'coron',
      'bohol',
    ]);

    await Promise.all([
      request(app).delete(`/bucket-list/${low.body.id}`),
      request(app).delete(`/bucket-list/${high.body.id}`),
    ]);
  });

  it('rejects an unavailable destination', async () => {
    const response = await request(app)
      .post('/bucket-list')
      .send({ destinationId: 'not-real' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DESTINATION_NOT_FOUND');
  });

  it('validates priorities, statuses, notes, and empty updates', async () => {
    const invalidCreate = await request(app).post('/bucket-list').send({
      destinationId: 'bohol',
      priority: 'urgent',
      personalNotes: 'x'.repeat(501),
    });
    const emptyUpdate = await request(app).patch('/bucket-list/not-real').send({});

    expect(invalidCreate.status).toBe(400);
    expect(invalidCreate.body.error.code).toBe('VALIDATION_ERROR');
    expect(emptyUpdate.status).toBe(400);
    expect(emptyUpdate.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns a stable response for an unknown item', async () => {
    const [updated, removed] = await Promise.all([
      request(app).patch('/bucket-list/not-real').send({ status: 'skipped' }),
      request(app).delete('/bucket-list/not-real'),
    ]);

    expect(updated.status).toBe(404);
    expect(updated.body.error.code).toBe('BUCKET_LIST_ITEM_NOT_FOUND');
    expect(removed.status).toBe(404);
    expect(removed.body.error.code).toBe('BUCKET_LIST_ITEM_NOT_FOUND');
  });
});
