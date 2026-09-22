import type { FestivalGateway } from '../gateways';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { mockFestivals } from '../data/mockFestivals';
import { MockFestivalGateway } from '../gateways';
import { FestivalDetailScreen } from '../screens/FestivalDetailScreen';
import { FestivalListScreen } from '../screens/FestivalListScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockFestivalId = 'kadayawan';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockFestivalId }),
  useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }),
}));

describe('festival mobile screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFestivalId = 'kadayawan';
  });

  it('loads upcoming cards and opens details', async () => {
    await render(<FestivalListScreen gateway={new MockFestivalGateway(mockFestivals, 9, 0)} />);

    expect(await screen.findByText('Peñafrancia Festival')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: /Kadayawan Festival, Davao City/i }));
    expect(mockPush).toHaveBeenCalledWith('/festivals/kadayawan');
  });

  it('switches to calendar mode and clears an empty search', async () => {
    await render(<FestivalListScreen gateway={new MockFestivalGateway(mockFestivals, 1, 0)} />);
    await screen.findByText('Sinulog Festival');

    fireEvent.press(screen.getByRole('button', { name: 'calendar view' }));
    expect(await screen.findByText('Festival calendar')).toBeTruthy();
    expect(screen.getAllByText('Jan').length).toBeGreaterThan(1);

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Search festivals'), 'no such celebration');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(await screen.findByText('No festivals match')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(await screen.findByText('Sinulog Festival')).toBeTruthy();
  });

  it('shows a retry action when list loading fails', async () => {
    const failingGateway: FestivalGateway = {
      list: jest.fn().mockRejectedValue(new Error('offline')),
      getById: jest.fn(),
    };
    await render(<FestivalListScreen gateway={failingGateway} />);

    expect(await screen.findByText('The celebration paused')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('renders culture, schedule, survival, accommodation, and dining details', async () => {
    await render(<FestivalDetailScreen gateway={new MockFestivalGateway(mockFestivals, 1, 0)} />);

    expect(await screen.findByRole('header', { name: 'Kadayawan Festival' })).toBeTruthy();
    expect(screen.getByText('History and meaning')).toBeTruthy();
    expect(screen.getByText('Typical festival-day flow')).toBeTruthy();
    expect(screen.getByText('Travel advice')).toBeTruthy();
    expect(screen.getByText('Survival guide')).toBeTruthy();
    expect(screen.getByText('Accommodation')).toBeTruthy();
    expect(screen.getByText('Dining')).toBeTruthy();
    expect(screen.getByText('2026 schedule confirmed')).toBeTruthy();
    expect(screen.getByText('Saraya-curated guidance')).toBeTruthy();
    expect(screen.getByText('Sources')).toBeTruthy();
    expect(screen.getByText('Cultural guide')).toBeTruthy();
    expect(screen.getByText('Cultural sources')).toBeTruthy();
    expect(screen.getByText(/thanksgiving for nature, harvest/i)).toBeTruthy();
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
  });

  it('joins famous and smaller festivals to their own cultural guides', async () => {
    mockFestivalId = 'ati-atihan';
    const ati = await render(
      <FestivalDetailScreen gateway={new MockFestivalGateway(mockFestivals, 1, 0)} />,
    );
    expect(await screen.findByText(/official visitor page describes Ati-Atihan/i)).toBeTruthy();
    await ati.unmount();

    mockFestivalId = 'sinulog';
    const sinulog = await render(
      <FestivalDetailScreen gateway={new MockFestivalGateway(mockFestivals, 1, 0)} />,
    );
    expect(await screen.findByText(/exemplify the city’s heritage/i)).toBeTruthy();
    expect(screen.getByText('Partially verified')).toBeTruthy();
    await sinulog.unmount();

    mockFestivalId = 'diyandi-balingasag';
    await render(<FestivalDetailScreen gateway={new MockFestivalGateway(mockFestivals, 1, 0)} />);
    expect(await screen.findAllByText('Evidence still needed')).toHaveLength(3);
    expect(screen.queryByText('Cultural sources')).toBeNull();
  });

  it('shows not-found and error states for festival details', async () => {
    const notFoundGateway: FestivalGateway = {
      list: jest.fn(),
      getById: jest.fn().mockResolvedValue(null),
    };
    const first = await render(<FestivalDetailScreen gateway={notFoundGateway} />);
    expect(await screen.findByText('Festival not found')).toBeTruthy();
    await first.unmount();

    const failingGateway: FestivalGateway = {
      list: jest.fn(),
      getById: jest.fn().mockRejectedValue(new Error('offline')),
    };
    await render(<FestivalDetailScreen gateway={failingGateway} />);
    expect(await screen.findByText('We lost the parade route')).toBeTruthy();
  });
});
