import request from 'supertest';

import { app } from '../../src/app';

describe('safety and weather API', () => {
  it('looks up alerts by coordinates, region, and destination', async () => {
    const [coordinates, region, destination] = await Promise.all([
      request(app).get('/safety-alerts').query({ latitude: 14.6, longitude: 121 }),
      request(app).get('/safety-alerts').query({ region: 'Bicol Region' }),
      request(app).get('/safety-alerts').query({ destinationId: 'cebu-city' }),
    ]);

    expect(coordinates.status).toBe(200);
    expect(coordinates.body.location.kind).toBe('coordinates');
    expect(region.body.alerts).toEqual(expect.arrayContaining([expect.objectContaining({ severity: 'red' })]));
    expect(destination.body.location).toEqual(expect.objectContaining({ destinationId: 'cebu-city' }));
  });

  it('returns an explicit empty active-alert result and validates context combinations', async () => {
    const empty = await request(app).get('/safety-alerts').query({ region: 'Ilocos Region' });
    const invalid = await request(app).get('/safety-alerts').query({ region: 'Bicol Region', destinationId: 'cebu-city' });

    expect(empty.status).toBe(200);
    expect(empty.body.alerts).toEqual([]);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns demo weather for coordinates and destinations', async () => {
    const coordinates = await request(app).get('/weather').query({ latitude: 14.6, longitude: 121 });
    const destination = await request(app).get('/weather').query({ destinationId: 'cebu-city' });

    expect(coordinates.status).toBe(200);
    expect(coordinates.body.source.isDemo).toBe(true);
    expect(destination.status).toBe(200);
    expect(destination.body.location.destinationId).toBe('cebu-city');
  });

  it('supports regional and detail routes, including empty and not-found results', async () => {
    const known = await request(app).get('/alerts/Bicol%20Region');
    const unknownRegion = await request(app).get('/alerts/Unknown%20Region');
    const detail = await request(app).get('/safety-alerts/demo-bicol-severe-weather');
    const missing = await request(app).get('/safety-alerts/not-real');

    expect(known.status).toBe(200);
    expect(known.body.alerts.length).toBeGreaterThan(0);
    expect(unknownRegion.body.alerts).toEqual([]);
    expect(detail.body).toEqual(expect.objectContaining({ severity: 'red' }));
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('SAFETY_ALERT_NOT_FOUND');
  });

  it('rejects invalid weather queries', async () => {
    const response = await request(app).get('/weather').query({ latitude: 999, longitude: 121 });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
