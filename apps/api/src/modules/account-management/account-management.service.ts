import path from 'node:path';

import { accountReauthenticationRequestSchema } from '@saraya/contracts';

import { getPhotoStorage } from '../../integrations/photo-storage/photo-storage';
import { PostgresAuthRepository } from '../auth/auth.postgres-repository';
import { invalidCredentials } from '../auth/auth.errors';
import { createGoogleTokenVerifierFromEnvironment, type GoogleTokenVerifier } from '../auth/google-token-verifier';
import { AccountActionTokenService } from './account-action.tokens';
import { AccountManagementRepository } from './account-management.repository';

export class AccountManagementService {
  constructor(
    private readonly repository = new AccountManagementRepository(),
    private readonly users = new PostgresAuthRepository(),
    private readonly google: GoogleTokenVerifier = createGoogleTokenVerifierFromEnvironment(),
    private readonly actionTokens = new AccountActionTokenService(),
  ) {}

  async reauthenticate(userId: string, rawInput: unknown) {
    const { idToken } = accountReauthenticationRequestSchema.parse(rawInput);
    const identity = await this.google.verify(idToken);
    const user = await this.users.findUserByGoogleSubject(identity.subject);
    if (!user || user.id !== userId) {
      throw invalidCredentials('Choose the Google account connected to this Saraya profile.');
    }
    return this.actionTokens.issue(userId);
  }

  verifyAction(userId: string, token: string) {
    this.actionTokens.verify(token, userId);
  }

  exportData(userId: string) {
    return this.repository.exportData(userId);
  }

  async deleteAccount(userId: string) {
    const storage = getPhotoStorage();
    await this.repository.deleteAccount(userId, async (photoUrls) => {
      await Promise.all(photoUrls.map((url) => storage.delete(path.basename(url))));
    });
  }
}
