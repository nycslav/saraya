import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { mockPremiumProducts } from '../gateways/mock-subscription.gateway';
import { PurchaseCancelledError } from '../gateways/subscription.gateway';
import { PaywallScreen } from '../screens/PaywallScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockGetAccess = jest.fn();
const mockGetProducts = jest.fn();
const mockPurchase = jest.fn();
const mockRestore = jest.fn();
const mockGetQuota = jest.fn();
const mockCreditTopUp = jest.fn();

const freeExhaustedQuota = {
  access: 'free',
  includedLimit: 3,
  includedRemaining: 0,
  topUpRemaining: 0,
  canGenerate: false,
  canRegenerate: false,
  periodStart: null,
  periodEnd: null,
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ destinationId: 'siargao' }),
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock('../gateways/revenuecat-subscription.gateway', () => ({
  premiumGateway: {
    getAccess: (...args: unknown[]) => mockGetAccess(...args),
    getProducts: (...args: unknown[]) => mockGetProducts(...args),
    purchase: (...args: unknown[]) => mockPurchase(...args),
    restore: (...args: unknown[]) => mockRestore(...args),
  },
}));

jest.mock('../services/generation-quota', () => ({
  generationQuotaGateway: {
    getQuota: (...args: unknown[]) => mockGetQuota(...args),
    creditTopUp: (...args: unknown[]) => mockCreditTopUp(...args),
  },
}));

describe('Premium and generation paywall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccess.mockResolvedValue('free');
    mockGetProducts.mockResolvedValue(mockPremiumProducts);
    mockGetQuota.mockResolvedValue(freeExhaustedQuota);
    mockPurchase.mockResolvedValue({
      access: 'premium',
      kind: 'lifetime-premium',
      transactionId: 'lifetime-transaction',
    });
    mockRestore.mockResolvedValue('free');
    mockCreditTopUp.mockResolvedValue({
      credited: true,
      quota: { ...freeExhaustedQuota, topUpRemaining: 10, canGenerate: true },
    });
  });

  it('shows lifetime Premium and the 10-generation pack using store prices', async () => {
    await render(<PaywallScreen />);

    expect(await screen.findByRole('button', { name: 'Unlock Lifetime Premium — $39.99' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add 10 generations — $5.00' })).toBeTruthy();
    expect(screen.queryByText('Monthly')).toBeNull();
    expect(screen.queryByText('Annual')).toBeNull();
  });

  it('purchases lifetime Premium and resumes saved itinerary preferences', async () => {
    await render(<PaywallScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Unlock Lifetime Premium — $39.99' }));
    });

    expect(mockPurchase).toHaveBeenCalledWith('saraya_premium_lifetime');
    expect(await screen.findByText('Lifetime Premium is active. You have 10 included generations this calendar month.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue to my itinerary' }));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/premium/itinerary',
      params: { destinationId: 'siargao', resumeAfterPurchase: 'true' },
    });
  });

  it('credits a top-up exactly from its transaction without activating Premium', async () => {
    mockPurchase.mockResolvedValueOnce({
      access: 'free',
      kind: 'generation-top-up',
      transactionId: 'top-up-transaction',
    });
    await render(<PaywallScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Add 10 generations — $5.00' }));
    });

    expect(mockCreditTopUp).toHaveBeenCalledWith('free', 'top-up-transaction');
    expect(await screen.findByText('10 itinerary generations were added to your purchased balance.')).toBeTruthy();
  });

  it('treats cancellation as recoverable and keeps purchase actions available', async () => {
    mockPurchase.mockRejectedValueOnce(new PurchaseCancelledError());
    await render(<PaywallScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Unlock Lifetime Premium — $39.99' }));
    });

    expect(await screen.findByText('Purchase cancelled. Your trip choices are still saved.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unlock Lifetime Premium — $39.99' })).toBeTruthy();
  });

  it('shows retry paths after a purchase failure', async () => {
    mockPurchase.mockRejectedValueOnce(new Error('Store unavailable'));
    await render(<PaywallScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Add 10 generations — $5.00' }));
    });

    expect(await screen.findByText('The purchase could not be completed. Try again when you are ready.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add 10 generations — $5.00' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload purchase options' })).toBeTruthy();
  });

  it('restores lifetime Premium', async () => {
    mockRestore.mockResolvedValueOnce('premium');
    mockGetQuota.mockResolvedValueOnce(freeExhaustedQuota).mockResolvedValueOnce({
      ...freeExhaustedQuota,
      access: 'premium',
      includedLimit: 10,
      includedRemaining: 10,
      canGenerate: true,
      canRegenerate: true,
      periodStart: '2026-09-01T00:00:00.000Z',
      periodEnd: '2026-10-01T00:00:00.000Z',
    });
    await render(<PaywallScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Restore Lifetime Premium' }));
    });

    expect(await screen.findByText('Your lifetime Premium purchase was restored.')).toBeTruthy();
  });

  it('shows a retry path when the offering has no configured products', async () => {
    mockGetProducts.mockResolvedValueOnce([]);
    await render(<PaywallScreen />);

    expect(await screen.findByText('No purchase options available')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lifetime Premium unavailable' })).toBeDisabled());
  });
});
