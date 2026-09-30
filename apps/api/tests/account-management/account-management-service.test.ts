import { AccountActionTokenService } from '../../src/modules/account-management/account-action.tokens';
import { AccountManagementService } from '../../src/modules/account-management/account-management.service';
import type { AccountManagementRepository } from '../../src/modules/account-management/account-management.repository';
import type { PostgresAuthRepository } from '../../src/modules/auth/auth.postgres-repository';
import type { GoogleTokenVerifier } from '../../src/modules/auth/google-token-verifier';

function serviceFor(linkedUserId: string | null) {
  const repository = { exportData: jest.fn(), deleteAccount: jest.fn().mockResolvedValue([]) } as unknown as AccountManagementRepository;
  const users = {
    findUserByGoogleSubject: jest.fn().mockResolvedValue(linkedUserId ? { id: linkedUserId } : null),
  } as unknown as PostgresAuthRepository;
  const google = {
    verify: jest.fn().mockResolvedValue({ subject: 'google-subject' }),
  } as unknown as GoogleTokenVerifier;
  const tokens = new AccountActionTokenService('account-action-secret-that-is-at-least-32-characters');
  return new AccountManagementService(repository, users, google, tokens);
}

describe('AccountManagementService', () => {
  it('issues a short-lived action token only for the Google identity linked to the session', async () => {
    const service = serviceFor('user-1');
    const confirmation = await service.reauthenticate('user-1', { idToken: 'fresh-google-token' });

    expect(confirmation.expiresAt).toBeTruthy();
    expect(() => service.verifyAction('user-1', confirmation.accountActionToken)).not.toThrow();
    expect(() => service.verifyAction('different-user', confirmation.accountActionToken)).toThrow();
  });

  it('rejects a mismatched Google identity', async () => {
    await expect(serviceFor('another-user').reauthenticate('user-1', {
      idToken: 'fresh-google-token',
    })).rejects.toMatchObject({ status: 401 });
  });

  it('rejects a stale account-action token', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
    try {
      const service = serviceFor('user-1');
      const confirmation = await service.reauthenticate('user-1', { idToken: 'fresh-google-token' });
      jest.setSystemTime(new Date('2026-09-30T12:06:00.000Z'));

      expect(() => service.verifyAction('user-1', confirmation.accountActionToken)).toThrow();
    } finally {
      jest.useRealTimers();
    }
  });
});
