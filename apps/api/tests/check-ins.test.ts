import request from 'supertest';

import { app } from '../src/app';

describe('check-ins and achievements API', () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    await Promise.all(createdIds.splice(0).map((id) => request(app).delete(`/check-ins/${id}`)));
  });

  it('records a manual visit and returns its newly unlocked badge', async () => {
    const response = await request(app).post('/check-ins').send({
      destinationId: 'siargao',
      visitedAt: '2026-08-12T04:00:00.000Z',
      journalEntry: 'Cloud 9 was calm just after sunrise.',
      mood: 'amazed',
      companions: ['Ana'],
      tags: ['Surfing', 'Beach'],
    });

    expect(response.status).toBe(201);
    createdIds.push(response.body.checkIn.id);
    expect(response.body.checkIn).toEqual(expect.objectContaining({
      destinationId: 'siargao',
      userId: 'demo-user',
      mood: 'amazed',
    }));
    expect(response.body.newlyUnlockedAchievements).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'first-story' })]),
    );
  });

  it('returns an enriched timeline and travel statistics', async () => {
    const created = await request(app).post('/check-ins').send({
      destinationId: 'vigan',
      visitedAt: '2026-07-10T04:00:00.000Z',
      journalEntry: 'Walked along Calle Crisologo.',
    });
    createdIds.push(created.body.checkIn.id);

    const [timeline, statistics] = await Promise.all([
      request(app).get('/check-ins/timeline'),
      request(app).get('/check-ins/statistics'),
    ]);
    expect(timeline.status).toBe(200);
    expect(timeline.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ destinationName: 'Vigan', islandGroup: 'Luzon' }),
    ]));
    expect(statistics.body).toEqual(expect.objectContaining({ totalVisits: 1, uniqueDestinations: 1 }));
  });

  it('rejects unknown destinations, future visits, and rapid duplicate submissions', async () => {
    const unknown = await request(app).post('/check-ins').send({ destinationId: 'not-real' });
    const future = await request(app).post('/check-ins').send({
      destinationId: 'bohol', visitedAt: '2099-01-01T00:00:00.000Z',
    });
    const first = await request(app).post('/check-ins').send({ destinationId: 'coron' });
    createdIds.push(first.body.checkIn.id);
    const duplicate = await request(app).post('/check-ins').send({ destinationId: 'coron' });

    expect(unknown.status).toBe(404);
    expect(future.status).toBe(400);
    expect(duplicate.status).toBe(409);
  });

  it('lists locked and unlocked achievement progress', async () => {
    const response = await request(app).get('/achievements');
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(5);
    expect(response.body[0]).toEqual(expect.objectContaining({
      progress: expect.any(Number), isUnlocked: expect.any(Boolean),
    }));
  });

  it('accepts supported travel photos and rejects other file types', async () => {
    const image = await request(app)
      .post('/check-ins/photos')
      .attach('photo', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), {
        filename: 'memory.jpg',
        contentType: 'image/jpeg',
      });
    const text = await request(app)
      .post('/check-ins/photos')
      .attach('photo', Buffer.from('not an image'), {
        filename: 'memory.txt',
        contentType: 'text/plain',
      });

    expect(image.status).toBe(201);
    expect(image.body.photoUrl).toMatch(/^\/uploads\/check-ins\/.+\.jpg$/);
    expect(text.status).toBe(400);
    expect(text.body.error.code).toBe('INVALID_PHOTO');
  });
});
