import type { DestinationDetail, DestinationSummary, UserProfile } from '@saraya/contracts';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { BucketListScreen } from '@/features/bucket-list/screens/BucketListScreen';
import { DestinationDetailScreen } from '@/features/destinations/screens/DestinationDetailScreen';
import { CreateCheckInScreen } from '@/features/journey/screens/CreateCheckInScreen';
import { JourneyScreen } from '@/features/journey/screens/JourneyScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = { id: 'batanes', destinationId: 'batanes' };
let mockAuthUser: UserProfile | null = null;

const mockDestinationList = jest.fn();
const mockDestinationById = jest.fn();
const mockBucketList = jest.fn();
const mockBucketCreate = jest.fn();
const mockBucketUpdate = jest.fn();
const mockItineraryList = jest.fn();
const mockJourneyCreate = jest.fn();
const mockJourneyTimeline = jest.fn();
const mockJourneyStatistics = jest.fn();

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Icon = () => React.createElement(View, { accessibilityElementsHidden: true });
  return {
    ArrowLeft: Icon,
    Award: Icon,
    Camera: Icon,
    CalendarDays: Icon,
    Check: Icon,
    Heart: Icon,
    Image: Icon,
    MapPin: Icon,
    MapPinned: Icon,
    MoreVertical: Icon,
    NotebookPen: Icon,
    Plus: Icon,
    Route: Icon,
    Search: Icon,
    Sparkles: Icon,
    Star: Icon,
    Trash2: Icon,
    X: Icon,
  };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
    useLocalSearchParams: () => mockParams,
    useRouter: () => ({
      back: mockBack,
      canGoBack: () => true,
      push: mockPush,
      replace: mockReplace,
      setParams: jest.fn(),
    }),
  };
});

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ restoring: false, user: mockAuthUser }),
}));

jest.mock('@/features/discovery/gateways', () => ({
  destinationGateway: {
    getById: (...args: unknown[]) => mockDestinationById(...args),
    list: (...args: unknown[]) => mockDestinationList(...args),
  },
}));

jest.mock('@/features/bucket-list/gateways', () => ({
  bucketListGateway: {
    create: (...args: unknown[]) => mockBucketCreate(...args),
    delete: jest.fn(),
    list: (...args: unknown[]) => mockBucketList(...args),
    update: (...args: unknown[]) => mockBucketUpdate(...args),
  },
}));

jest.mock('@/features/itineraries/services/adapters', () => ({
  itineraryGateway: {
    delete: jest.fn(),
    list: (...args: unknown[]) => mockItineraryList(...args),
  },
}));

jest.mock('@/features/journey/gateways', () => ({
  journeyGateway: {
    create: (...args: unknown[]) => mockJourneyCreate(...args),
    statistics: (...args: unknown[]) => mockJourneyStatistics(...args),
    timeline: (...args: unknown[]) => mockJourneyTimeline(...args),
    uploadPhoto: jest.fn(),
  },
  resolvePhotoUrl: (value: string | null) => value,
}));

const destinationSummary: DestinationSummary = {
  id: 'batanes',
  name: 'Batanes',
  province: 'Batanes',
  region: 'Cagayan Valley',
  islandGroup: 'Luzon',
  category: 'Nature',
  rating: 4.9,
  summary: 'Rolling hills and Ivatan heritage.',
  thumbnailImageUrl: 'https://images.saraya.test/batanes.webp',
  heroTone: 'forest',
  tags: ['Nature', 'Heritage'],
};

const destinationDetail: DestinationDetail = {
  ...destinationSummary,
  description: 'A northern island destination shaped by Ivatan culture.',
  highlights: ['Marlboro Hills'],
  bestFor: ['Culture'],
  coordinates: { latitude: 20.4487, longitude: 121.9702 },
  culturalGuide: {
    historicalContext: 'Ivatan communities adapted their homes and traditions to the islands.',
    etiquette: ['Ask before photographing residents.'],
    localPhrase: 'Dios mamajes',
  },
};

const signedInUser: UserProfile = {
  id: 'user-1',
  email: 'traveler@example.com',
  displayName: 'Traveler',
  avatarUrl: null,
  homeRegion: null,
  travelStyle: 'Nature',
  budget: 'Comfort',
  interests: ['Nature'],
  preferredRegions: ['Luzon'],
  onboardingComplete: true,
};

describe('mobile sign-in gates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthUser = null;
    mockParams = { id: 'batanes', destinationId: 'batanes' };
    mockDestinationList.mockResolvedValue([destinationSummary]);
    mockDestinationById.mockResolvedValue(destinationDetail);
    mockBucketList.mockResolvedValue([]);
    mockItineraryList.mockResolvedValue([]);
    mockBucketCreate.mockResolvedValue({});
    mockBucketUpdate.mockResolvedValue({});
    mockJourneyCreate.mockResolvedValue({ checkIn: {}, newlyUnlockedAchievements: [] });
    mockJourneyTimeline.mockResolvedValue([]);
    mockJourneyStatistics.mockResolvedValue({
      totalVisits: 0,
      uniqueDestinations: 0,
      islandGroupsVisited: 0,
      achievementsUnlocked: 0,
    });
  });

  it('opens login instead of saving a destination for a signed-out user', async () => {
    await render(<DestinationDetailScreen />);

    const saveButton = await screen.findByRole('button', { name: 'Save to Bucket' });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockBucketList).not.toHaveBeenCalled();

    await act(async () => { fireEvent.press(saveButton); });

    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    expect(mockBucketCreate).not.toHaveBeenCalled();
  });

  it('keeps the existing destination save behavior for a signed-in user', async () => {
    mockAuthUser = signedInUser;
    await render(<DestinationDetailScreen />);

    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Save to Bucket' }));
    });

    await waitFor(() => expect(mockBucketCreate).toHaveBeenCalledWith({ destinationId: 'batanes' }));
    expect(mockPush).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('waits until Save to My Journey before asking a signed-out user to log in', async () => {
    await render(<CreateCheckInScreen />);

    expect(mockPush).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Save to My Journey' }));
    });

    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    expect(mockJourneyCreate).not.toHaveBeenCalled();
  });

  it('keeps the existing journey save behavior for a signed-in user', async () => {
    mockAuthUser = signedInUser;
    await render(<CreateCheckInScreen />);

    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Save to My Journey' }));
    });

    await waitFor(() => expect(mockJourneyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ destinationId: 'batanes' }),
    ));
    expect(mockPush).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('asks for login only after the final Add to Bucket List action', async () => {
    await render(<BucketListScreen />);

    const addButton = await screen.findByRole('button', { name: 'Add a destination' });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockBucketList).not.toHaveBeenCalled();

    await act(async () => { fireEvent.press(addButton); });
    await act(async () => {
      fireEvent.press(await screen.findByRole('radio', { name: 'Batanes' }));
    });
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Add to Bucket List' }));
    });

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(auth)/login'));
    expect(mockBucketCreate).not.toHaveBeenCalled();
  });

  it('keeps the existing bucket-list save behavior for a signed-in user', async () => {
    mockAuthUser = signedInUser;
    await render(<BucketListScreen />);

    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Add a destination' }));
    });
    await act(async () => {
      fireEvent.press(await screen.findByRole('radio', { name: 'Batanes' }));
    });
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Add to Bucket List' }));
    });

    await waitFor(() => expect(mockBucketCreate).toHaveBeenCalledWith({
      destinationId: 'batanes',
      personalNotes: '',
      priority: 'medium',
      status: 'planned',
    }));
    expect(mockPush).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('shows a saved itinerary under Trip plans and opens its detail screen', async () => {
    mockAuthUser = signedInUser;
    mockParams = { view: 'plans' };
    mockItineraryList.mockResolvedValue([{
      id: 'itinerary-batanes',
      destinationId: 'batanes',
      title: 'Batanes mindful escape',
      subtitle: 'A three-day island plan',
      durationDays: 3,
      budget: 'Comfort',
      generatedAt: '2026-09-30T00:00:00.000Z',
    }]);

    await render(<BucketListScreen />);

    expect(await screen.findByText('Batanes mindful escape')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Open Batanes mindful escape' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/itineraries/[id]',
      params: { id: 'itinerary-batanes' },
    });
  });

  it('shows guest-safe Journey content without loading personal records or redirecting', async () => {
    await render(<JourneyScreen />);

    expect(await screen.findByText('Your Journey starts when you save')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record a visit' })).toBeTruthy();
    expect(mockJourneyTimeline).not.toHaveBeenCalled();
    expect(mockJourneyStatistics).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('loads personal Journey records for a signed-in user', async () => {
    mockAuthUser = signedInUser;
    await render(<JourneyScreen />);

    await waitFor(() => {
      expect(mockJourneyTimeline).toHaveBeenCalledTimes(1);
      expect(mockJourneyStatistics).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('button', { name: 'Record a visit' })).toBeTruthy();
  });
});
