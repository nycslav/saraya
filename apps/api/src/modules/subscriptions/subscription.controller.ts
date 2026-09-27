import type { NextFunction, Request, Response } from 'express';

import {
  RevenueCatCustomerConfigurationError,
  RevenueCatWebhookAuthenticationError,
  RevenueCatWebhookConfigurationError,
  RevenueCatWebhookVerifier,
} from '../../integrations/revenuecat';
import { SubscriptionService } from './subscription.service';

export type SubscriptionController = ReturnType<typeof createSubscriptionController>;

export function createSubscriptionController(
  service = new SubscriptionService(),
  verifier = new RevenueCatWebhookVerifier(),
) {
  return {
    state: async (_request: Request, response: Response, next: NextFunction) => {
      try {
        response.json(await service.getState(response.locals.authenticatedUserId));
      } catch (error) {
        next(error);
      }
    },
    synchronize: async (_request: Request, response: Response, next: NextFunction) => {
      try {
        response.json(await service.synchronize(response.locals.authenticatedUserId));
      } catch (error) {
        if (error instanceof RevenueCatCustomerConfigurationError) {
          response.status(503).json({
            error: { code: 'REVENUECAT_SYNC_UNAVAILABLE', message: error.message },
          });
          return;
        }
        next(error);
      }
    },
    webhook: async (request: Request, response: Response, next: NextFunction) => {
      try {
        if (!Buffer.isBuffer(request.body)) {
          response.status(400).json({
            error: { code: 'INVALID_WEBHOOK', message: 'The webhook body must be JSON.' },
          });
          return;
        }
        const rawBody = request.body;
        verifier.verify({
          authorization: request.header('authorization'),
          signature: request.header('x-revenuecat-webhook-signature'),
          rawBody,
        });
        let payload: unknown;
        try {
          payload = JSON.parse(rawBody.toString('utf8')) as unknown;
        } catch {
          response.status(400).json({
            error: { code: 'INVALID_WEBHOOK', message: 'The webhook body is not valid JSON.' },
          });
          return;
        }
        response.json({ status: await service.handleWebhook(payload) });
      } catch (error) {
        if (error instanceof RevenueCatWebhookAuthenticationError) {
          response.status(401).json({
            error: { code: 'INVALID_WEBHOOK_AUTHENTICATION', message: error.message },
          });
          return;
        }
        if (error instanceof RevenueCatWebhookConfigurationError) {
          response.status(503).json({
            error: { code: 'WEBHOOK_NOT_CONFIGURED', message: error.message },
          });
          return;
        }
        next(error);
      }
    },
  };
}
