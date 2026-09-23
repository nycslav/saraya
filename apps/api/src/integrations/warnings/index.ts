import { MockWarningProvider } from './mock-warning.provider';

export * from './mock-warning.provider';
export * from './warning.provider';

export function createWarningProvider() {
  return new MockWarningProvider();
}
