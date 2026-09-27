import express, { type RequestHandler } from 'express';
import request from 'supertest';

import type { RevenueCatCustomerProvider } from '../../src/integrations/revenuecat';
import { createSubscriptionController } from '../../src/modules/subscriptions/subscription.controller';
import { createSubscriptionRouter } from '../../src/modules/subscriptions/subscription.route';
import { InMemorySubscriptionRepository } from '../../src/modules/subscriptions/subscription.repository';
import { SubscriptionService } from '../../src/modules/subscriptions/subscription.service';

function createApp(userId?: string) {
  const repository = new InMemorySubscriptionRepository();
  const provider: RevenueCatCustomerProvider = {
    getCustomer: jest.fn().mockResolvedValue({
      premiumActive: true,
      premiumProductId: 'saraya_premium_lifetime',
      premiumOriginalTransactionId: 'lifetime-1',
      premiumExpiresAt: null,
      topUps: [],
    }),
  };
  const controller = createSubscriptionController(new SubscriptionService(repository, provider));
  const authenticate: RequestHandler = (_request, response, next) => {
    if (!userId) {
      response.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED' } });
      return;
    }
    response.locals.authenticatedUserId = userId;
    next();
  };
  const app = express();
  app.use(express.json());
  app.use('/subscriptions', createSubscriptionRouter(authenticate, controller));
  return app;
}

describe('subscription API', () => {
  it('fails closed without authenticated identity', async () => {
    const response = await request(createApp()).get('/subscriptions/me');
    expect(response.status).toBe(401);
  });

  it('returns authoritative Free state and synchronizes RevenueCat state', async () => {
    const app = createApp('user-1');
    const free = await request(app).get('/subscriptions/me');
    const synchronized = await request(app).post('/subscriptions/sync');

    expect(free.body).toMatchObject({ access: 'free', quota: { includedRemaining: 3 } });
    expect(synchronized.body).toMatchObject({ access: 'premium', quota: { includedRemaining: 10 } });
  });
});
