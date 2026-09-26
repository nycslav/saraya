import request from 'supertest';

import { app } from '../src/app';

describe('destination API', () => {
  it('reports API health', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns all 99 curated destination summaries', async () => {
    const response = await request(app).get('/destinations');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(99);
    expect(response.body[0]).not.toHaveProperty('culturalGuide');
    for (const destination of response.body) {
      expect(destination.summary.match(/[.!?](?=\s|$)/g)).toHaveLength(2);
    }
  });

  it('uses the current official regional groupings', async () => {
    const [puertoGalera, siquijor, malamawi] = await Promise.all([
      request(app).get('/destinations').query({ search: 'Puerto Galera' }),
      request(app).get('/destinations').query({ search: 'Siquijor' }),
      request(app).get('/destinations').query({ search: 'Malamawi' }),
    ]);

    expect(puertoGalera.body).toEqual([
      expect.objectContaining({ id: 'puerto-galera', region: 'MIMAROPA' }),
    ]);
    expect(siquijor.body).toEqual([
      expect.objectContaining({ id: 'siquijor', region: 'Negros Island Region' }),
    ]);
    expect(malamawi.body).toEqual([
      expect.objectContaining({ id: 'basilan-malamawi', region: 'Zamboanga Peninsula' }),
    ]);
  });

  it('filters destinations by island group and search text', async () => {
    const response = await request(app)
      .get('/destinations')
      .query({ islandGroup: 'Mindanao', search: 'siargao' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({ id: 'siargao', islandGroup: 'Mindanao' }),
    ]);
  });

  it('returns destination details', async () => {
    const response = await request(app).get('/destinations/batanes');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'batanes',
        thumbnailImageUrl: expect.stringContaining('/destination-images/batanes.webp'),
        coordinates: expect.objectContaining({ latitude: expect.any(Number) }),
        culturalGuide: expect.objectContaining({ etiquette: expect.any(Array) }),
      }),
    );
  });

  it('returns a stable not-found response', async () => {
    const response = await request(app).get('/destinations/not-real');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DESTINATION_NOT_FOUND');
  });

  it('rejects invalid discovery filters', async () => {
    const response = await request(app)
      .get('/destinations')
      .query({ islandGroup: 'Atlantis' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
