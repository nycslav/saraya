import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';

import { AuthenticationError } from '../../src/modules/auth/auth.errors';
import { JwtAuthTokenService } from '../../src/modules/auth/auth.tokens';
import { createAuthenticationMiddleware } from '../../src/platform/http/auth.middleware';

const tokens = new JwtAuthTokenService(
  'access-secret-that-is-at-least-32-characters',
  'refresh-secret-that-is-at-least-32-characters',
);

function createTestApp() {
  const app = express();
  app.get('/protected', createAuthenticationMiddleware(tokens), (_request, response) => {
    response.json({ userId: response.locals.authenticatedUserId });
  });
  const errors: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof AuthenticationError) {
      response.status(error.status).json({ error: { code: error.code } });
      return;
    }
    response.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  };
  app.use(errors);
  return app;
}

describe('authentication middleware', () => {
  it('sets the authenticated user from a valid Saraya access token', async () => {
    const accessToken = await tokens.issueAccessToken('user-123');
    const response = await request(createTestApp())
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: 'user-123' });
  });

  it('rejects missing, malformed, and refresh-token authorization', async () => {
    const refreshToken = (await tokens.issueRefreshToken('user-123')).token;
    expect((await request(createTestApp()).get('/protected')).status).toBe(401);
    expect((await request(createTestApp()).get('/protected').set('Authorization', 'Basic abc')).status)
      .toBe(401);
    expect((await request(createTestApp()).get('/protected')
      .set('Authorization', `Bearer ${refreshToken}`)).status).toBe(401);
  });
});
