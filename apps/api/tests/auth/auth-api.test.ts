import type { AuthSession } from '@saraya/contracts';
import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { ZodError } from 'zod';

import { createAuthController } from '../../src/modules/auth/auth.controller';
import { AuthenticationError } from '../../src/modules/auth/auth.errors';
import { createAuthRouter } from '../../src/modules/auth/auth.route';
import type { AuthService } from '../../src/modules/auth/auth.service';

const session: AuthSession = {
  accessToken: 'saraya-access-token',
  refreshToken: 'saraya-refresh-token',
  user: {
    id: 'user-1',
    email: 'traveler@example.com',
    displayName: 'Saraya Traveler',
    avatarUrl: null,
    homeRegion: null,
    travelStyle: null,
    budget: null,
    interests: [],
    preferredRegions: [],
    onboardingComplete: true,
  },
};

function createTestApp(service: Pick<AuthService, 'loginWithGoogle' | 'refresh' | 'logout'>) {
  const app = express();
  app.use(express.json());
  app.use('/auth', createAuthRouter(createAuthController(service as AuthService)));
  const errors: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof AuthenticationError) {
      response.status(error.status).json({ error: { code: error.code } });
      return;
    }
    if (error instanceof ZodError) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
      return;
    }
    response.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  };
  app.use(errors);
  return app;
}

describe('authentication API', () => {
  it('exposes Google login, refresh, and logout using the mobile contract', async () => {
    const service = {
      loginWithGoogle: jest.fn().mockResolvedValue(session),
      refresh: jest.fn().mockResolvedValue(session),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    const app = createTestApp(service);

    const google = await request(app).post('/auth/google').send({ idToken: 'google-proof' });
    const refresh = await request(app).post('/auth/refresh').send({ refreshToken: 'refresh-1' });
    const logout = await request(app).post('/auth/logout').send({ refreshToken: 'refresh-2' });

    expect(google.status).toBe(200);
    expect(google.body).toEqual(session);
    expect(refresh.status).toBe(200);
    expect(refresh.body).toEqual(session);
    expect(logout.status).toBe(204);
    expect(service.loginWithGoogle).toHaveBeenCalledWith('google-proof');
    expect(service.refresh).toHaveBeenCalledWith('refresh-1');
    expect(service.logout).toHaveBeenCalledWith('refresh-2');
  });

  it('rejects malformed requests and preserves authentication errors', async () => {
    const service = {
      loginWithGoogle: jest.fn().mockRejectedValue(
        new AuthenticationError('ACCOUNT_NOT_FOUND', 'Not registered.', 403),
      ),
      refresh: jest.fn(),
      logout: jest.fn(),
    };
    const app = createTestApp(service);

    expect((await request(app).post('/auth/google').send({})).status).toBe(400);
    const unknown = await request(app).post('/auth/google').send({ idToken: 'valid-proof' });
    expect(unknown.status).toBe(403);
    expect(unknown.body.error.code).toBe('ACCOUNT_NOT_FOUND');
  });
});
