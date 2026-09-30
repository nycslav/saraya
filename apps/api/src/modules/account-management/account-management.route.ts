import path from 'node:path';

import archiver from 'archiver';
import { accountReauthenticationResponseSchema, deleteAccountRequestSchema } from '@saraya/contracts';
import { Router, type RequestHandler } from 'express';

import { getPhotoStorage } from '../../integrations/photo-storage/photo-storage';
import { requireAuthenticatedUser } from '../../platform/http/auth.middleware';
import { AccountManagementService } from './account-management.service';

export function createAccountManagementRouter(
  authenticated: RequestHandler = requireAuthenticatedUser,
  providedService?: AccountManagementService,
) {
  const router = Router();
  let service = providedService;
  const getService = () => service ??= new AccountManagementService();
  router.post('/reauthenticate', authenticated, async (request, response, next) => {
    try {
      response.json(accountReauthenticationResponseSchema.parse(
        await getService().reauthenticate(response.locals.authenticatedUserId, request.body),
      ));
    } catch (error) { next(error); }
  });
  router.get('/export', authenticated, async (request, response, next) => {
    try {
      const actionToken = request.header('x-account-action-token') ?? '';
      getService().verifyAction(response.locals.authenticatedUserId, actionToken);
      const bundle = await getService().exportData(response.locals.authenticatedUserId);
      response.setHeader('Content-Type', 'application/zip');
      response.setHeader('Content-Disposition', 'attachment; filename="saraya-account-data.zip"');
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', next);
      archive.pipe(response);
      archive.append(JSON.stringify(bundle.data, null, 2), { name: 'saraya-data.json' });
      for (const url of bundle.photoUrls) {
        try {
          const fileName = path.basename(url);
          const photo = await getPhotoStorage().read(fileName);
          archive.append(photo.body, { name: `photos/${fileName}` });
        } catch {
          // A missing historical photo should not prevent the rest of the user's export.
        }
      }
      await archive.finalize();
    } catch (error) { next(error); }
  });
  router.delete('/', authenticated, async (request, response, next) => {
    try {
      const input = deleteAccountRequestSchema.parse(request.body);
      getService().verifyAction(response.locals.authenticatedUserId, input.accountActionToken);
      await getService().deleteAccount(response.locals.authenticatedUserId);
      response.status(204).send();
    } catch (error) { next(error); }
  });
  return router;
}

export const accountManagementRouter = createAccountManagementRouter();
