export class AuthenticationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export function invalidCredentials(message = 'The authentication token is invalid or expired.') {
  return new AuthenticationError('INVALID_AUTHENTICATION', message, 401);
}
