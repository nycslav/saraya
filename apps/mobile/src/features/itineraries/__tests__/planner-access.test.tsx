import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ItineraryPlannerScreen } from '../screens/ItineraryPlannerScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockGetAccess = jest.fn();
const mockGetQuota = jest.fn();
const mockConsume = jest.fn();
const mockGenerate = jest.fn();
const mockSaveItinerary = jest.fn();
const mockLoadPending = jest.fn();
const mockSavePending = jest.fn();
const mockClearPending = jest.fn();
let mockSearchParams: { destinationId: string; resumeAfterPurchase?: string };

const preferencesQuota = {
  access: 'free',
  includedLimit: 3,
  includedRemaining: 3,
  topUpRemaining: 0,
  canGenerate: true,
  canRegenerate: false,
  periodStart: null,
  periodEnd: null,
};

const generated = {
  id: 'itinerary-1',
  destinationId: 'siargao',
  title: 'Siargao plan',
  subtitle: '3 days',
  preferences: {
    destinationId: 'siargao',
    startingPoint: 'Nearest transport hub',
    durationDays: 3,
    budget: 'Comfort',
    interests: ['Nature', 'Local food', 'Culture'],
    pace: 'Balanced',
    accessibilityNeeds: 'No special requirements',
  },
  days: [{
    dayNumber: 1,
    title: 'Arrival',
    stops: [{ id: 'stop-1', time: '9:00 AM', title: 'Beach', detail: 'Explore', kind: 'activity' }],
  }],
  generatedAt: '2026-09-15T00:00:00.000Z',
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('@/features/discovery/gateways', () => ({
  destinationGateway: { getById: () => Promise.resolve({ id: 'siargao', name: 'Siargao' }) },
}));

jest.mock('@/features/subscriptions', () => ({
  premiumGateway: { getAccess: (...args: unknown[]) => mockGetAccess(...args) },
  generationQuotaGateway: {
    getQuota: (...args: unknown[]) => mockGetQuota(...args),
    consumeAfterSuccess: (...args: unknown[]) => mockConsume(...args),
  },
}));

jest.mock('../services/adapters', () => ({
  itineraryGateway: {
    generate: (...args: unknown[]) => mockGenerate(...args),
    save: (...args: unknown[]) => mockSaveItinerary(...args),
  },
  pendingItineraryStore: {
    load: (...args: unknown[]) => mockLoadPending(...args),
    save: (...args: unknown[]) => mockSavePending(...args),
    clear: (...args: unknown[]) => mockClearPending(...args),
  },
}));

describe('itinerary generation quota flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = { destinationId: 'siargao' };
    mockGetAccess.mockResolvedValue('free');
    mockGetQuota.mockResolvedValue(preferencesQuota);
    mockConsume.mockResolvedValue({
      source: 'included',
      quota: { ...preferencesQuota, includedRemaining: 2 },
    });
    mockGenerate.mockResolvedValue(generated);
    mockSaveItinerary.mockResolvedValue(undefined);
    mockLoadPending.mockResolvedValue(null);
    mockSavePending.mockResolvedValue(undefined);
    mockClearPending.mockResolvedValue(undefined);
  });

  it('lets a Free user with quota generate and consumes once only after success', async () => {
    await render(<ItineraryPlannerScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Generate my itinerary' }));
    });

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1));
    expect(mockConsume).toHaveBeenCalledTimes(1);
    expect(mockConsume).toHaveBeenCalledWith('free');
    expect(await screen.findByText('Siargao plan')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Regenerate' })).toBeNull();
  });

  it('does not consume quota when itinerary generation fails', async () => {
    mockGenerate.mockRejectedValueOnce(new Error('Generation failed'));
    await render(<ItineraryPlannerScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Generate my itinerary' }));
    });

    expect(await screen.findByText('We hit a detour')).toBeTruthy();
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it('preserves preferences and opens the paywall without generating when quota is exhausted', async () => {
    mockGetQuota.mockResolvedValueOnce({ ...preferencesQuota, includedRemaining: 0, canGenerate: false });
    await render(<ItineraryPlannerScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Generate my itinerary' }));
    });

    expect(mockSavePending).toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/premium/paywall',
      params: { destinationId: 'siargao' },
    });
  });

  it('loads saved preferences and continues generation after the purchase round trip', async () => {
    mockSearchParams = { destinationId: 'siargao', resumeAfterPurchase: 'true' };
    mockLoadPending.mockResolvedValueOnce(generated.preferences);
    mockGetAccess.mockResolvedValueOnce('free');

    await render(<ItineraryPlannerScreen />);

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledWith(
      generated.preferences,
      expect.any(AbortSignal),
    ));
    expect(mockConsume).toHaveBeenCalledWith('free');
    expect(await screen.findByText('Siargao plan')).toBeTruthy();
  });
});
