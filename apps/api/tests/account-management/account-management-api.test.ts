import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import request from 'supertest';
import { ZodError } from 'zod';

import { createAccountManagementRouter } from '../../src/modules/account-management/account-management.route';
import type { AccountManagementService } from '../../src/modules/account-management/account-management.service';

const authenticate: RequestHandler = (_request, response, next) => {
  response.locals.authenticatedUserId = 'user-1';
  next();
};

function createTestApp() {
  const service = {
    reauthenticate: jest.fn().mockResolvedValue({
      accountActionToken: 'fresh-action-token',
      expiresAt: '2026-09-30T12:05:00.000Z',
    }),
    verifyAction: jest.fn(),
    exportData: jest.fn().mockResolvedValue({
      data: { profile: { id: 'user-1' }, journey: { checkIns: [] } },
      photoUrls: [],
    }),
    deleteAccount: jest.fn().mockResolvedValue(undefined),
  };
  const app = express();
  app.use(express.json());
  app.use('/account', createAccountManagementRouter(
    authenticate,
    service as unknown as AccountManagementService,
  ));
  const errors: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
      return;
    }
    response.status(401).json({ error: { code: 'ACCOUNT_CONFIRMATION_REQUIRED' } });
  };
  app.use(errors);
  return { app, service };
}

describe('account management API', () => {
  it('reauthenticates with Google before issuing an account-action token', async () => {
    const { app, service } = createTestApp();
    const response = await request(app).post('/account/reauthenticate').send({ idToken: 'google-id-token' });

    expect(response.status).toBe(200);
    expect(response.body.accountActionToken).toBe('fresh-action-token');
    expect(service.reauthenticate).toHaveBeenCalledWith('user-1', { idToken: 'google-id-token' });
  });

  it('streams a ZIP only after validating the fresh account-action token', async () => {
    const { app, service } = createTestApp();
    const response = await request(app)
      .get('/account/export')
      .set('x-account-action-token', 'fresh-action-token')
      .buffer(true)
      .parse((responseStream, callback) => {
        const chunks: Buffer[] = [];
        responseStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        responseStream.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/zip');
    expect((response.body as Buffer).subarray(0, 2).toString()).toBe('PK');
    expect(service.verifyAction).toHaveBeenCalledWith('user-1', 'fresh-action-token');
  });

  it('requires the exact typed confirmation before deleting the account', async () => {
    const { app, service } = createTestApp();
    expect((await request(app).delete('/account').send({
      accountActionToken: 'fresh-action-token', confirmation: 'delete',
    })).status).toBe(400);

    const response = await request(app).delete('/account').send({
      accountActionToken: 'fresh-action-token', confirmation: 'DELETE',
    });
    expect(response.status).toBe(204);
    expect(service.verifyAction).toHaveBeenCalledWith('user-1', 'fresh-action-token');
    expect(service.deleteAccount).toHaveBeenCalledWith('user-1');
  });
});
