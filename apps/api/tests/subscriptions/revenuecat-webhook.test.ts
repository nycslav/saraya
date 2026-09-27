import { createHmac } from 'node:crypto';

import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { ZodError } from 'zod';

import { RevenueCatWebhookVerifier } from '../../src/integrations/revenuecat';
import { createSubscriptionController } from '../../src/modules/subscriptions/subscription.controller';
import { createRevenueCatWebhookRouter } from '../../src/modules/subscriptions/subscription.route';
import { InMemorySubscriptionRepository } from '../../src/modules/subscriptions/subscription.repository';
import { SubscriptionService } from '../../src/modules/subscriptions/subscription.service';

const timestamp = 1_797_000_000;
const payload = {
  api_version: '1.0',
  event: {
    id: 'event-1',
    type: 'NON_RENEWING_PURCHASE',
    event_timestamp_ms: timestamp * 1000,
    app_user_id: 'unassociated-revenuecat-user',
    product_id: 'saraya_generations_10',
    entitlement_ids: [],
    transaction_id: 'transaction-1',
    environment: 'SANDBOX',
  },
};

function testApp() {
  const repository = new InMemorySubscriptionRepository();
  const service = new SubscriptionService(repository);
  const verifier = new RevenueCatWebhookVerifier('Bearer webhook-secret', 'signing-secret', () => timestamp);
  const controller = createSubscriptionController(service, verifier);
  const app = express();
  app.use('/webhooks/revenuecat', express.raw({ type: 'application/json' }), createRevenueCatWebhookRouter(controller));
  const errors: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
      return;
    }
    response.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  };
  app.use(errors);
  return app;
}

function headers(body: string) {
  return {
    Authorization: 'Bearer webhook-secret',
    'Content-Type': 'application/json',
    'X-RevenueCat-Webhook-Signature': `t=${timestamp},v1=${createHmac('sha256', 'signing-secret').update(`${timestamp}.${body}`).digest('hex')}`,
  };
}

describe('RevenueCat webhook endpoint', () => {
  it('authenticates the exact raw body and accepts an association-pending event', async () => {
    const body = JSON.stringify(payload);
    const response = await request(testApp()).post('/webhooks/revenuecat').set(headers(body)).send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'pending-association' });
  });

  it('rejects invalid authorization and signatures without exposing secrets', async () => {
    const body = JSON.stringify(payload);
    const response = await request(testApp())
      .post('/webhooks/revenuecat')
      .set({ ...headers(body), Authorization: 'wrong' })
      .send(body);

    expect(response.status).toBe(401);
    expect(JSON.stringify(response.body)).not.toContain('webhook-secret');
  });

  it('rejects malformed events after authentication', async () => {
    const body = JSON.stringify({ api_version: '1.0', event: { type: 'NOT_ENOUGH_FIELDS' } });
    const response = await request(testApp()).post('/webhooks/revenuecat').set(headers(body)).send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('deduplicates repeated delivery IDs', async () => {
    const app = testApp();
    const body = JSON.stringify(payload);
    await request(app).post('/webhooks/revenuecat').set(headers(body)).send(body);
    const duplicate = await request(app).post('/webhooks/revenuecat').set(headers(body)).send(body);

    expect(duplicate.body).toEqual({ status: 'duplicate' });
  });
});

describe('RevenueCatWebhookVerifier', () => {
  it('rejects stale signed requests', () => {
    const body = Buffer.from('{}');
    const signature = createHmac('sha256', 'secret').update('1.{}').digest('hex');
    const verifier = new RevenueCatWebhookVerifier(undefined, 'secret', () => 1000, 300);

    expect(() => verifier.verify({ rawBody: body, signature: `t=1,v1=${signature}` })).toThrow(
      'expired',
    );
  });
});
