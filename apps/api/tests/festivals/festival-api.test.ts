import request from 'supertest';

import { app } from '../../src/app';

describe('festival API', () => {
  it('lists the canonical catalog and applies filters', async () => {
    const list = await request(app).get('/festivals');
    const filtered = await request(app)
      .get('/festivals')
      .query({ search: 'lantern', region: 'Central Luzon', month: 12 });

    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(151);
    expect(filtered.status).toBe(200);
    expect(filtered.body).toEqual([expect.objectContaining({ id: 'giant-lantern' })]);
  });

  it('returns cyclically ordered upcoming festivals with filters', async () => {
    const response = await request(app).get('/festivals/upcoming').query({ month: 10 });
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body.every((festival: { typicalMonth: number }) => festival.typicalMonth === 10)).toBe(true);
  });

  it('returns complete festival detail and a standard not-found response', async () => {
    const detail = await request(app).get('/festivals/kadayawan');
    const missing = await request(app).get('/festivals/not-a-festival');

    expect(detail.status).toBe(200);
    expect(detail.body).toEqual(
      expect.objectContaining({
        id: 'kadayawan',
        culturalGuide: expect.objectContaining({ festivalId: 'kadayawan' }),
      }),
    );
    expect(missing.status).toBe(404);
    expect(missing.body.error).toEqual({
      code: 'FESTIVAL_NOT_FOUND',
      message: 'Festival not found.',
    });
  });

  it('rejects malformed queries and IDs', async () => {
    const invalidMonth = await request(app).get('/festivals').query({ month: 13 });
    const invalidId = await request(app).get('/festivals/NOT_VALID');

    expect(invalidMonth.status).toBe(400);
    expect(invalidMonth.body.error.code).toBe('VALIDATION_ERROR');
    expect(invalidId.status).toBe(400);
    expect(invalidId.body.error.code).toBe('VALIDATION_ERROR');
  });
});
