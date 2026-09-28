import type { DestinationSummary } from '@saraya/contracts';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DestinationCard } from '../components/DestinationCard';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const destination: DestinationSummary = {
  id: 'batanes',
  name: 'Batanes',
  province: 'Batanes',
  region: 'Cagayan Valley',
  islandGroup: 'Luzon',
  category: 'Nature',
  rating: 4.9,
  summary: 'Rolling hills and Ivatan heritage.',
  heroTone: 'forest',
  tags: ['Nature', 'Heritage'],
};

describe('DestinationCard', () => {
  beforeEach(() => mockPush.mockClear());

  it('keeps destination navigation available in the carousel layout', async () => {
    await render(<DestinationCard destination={destination} variant="carousel" />);

    fireEvent.press(screen.getByRole('button', { name: /Batanes, Batanes, rated 4.9/ }));

    expect(mockPush).toHaveBeenCalledWith('/destinations/batanes');
    expect(screen.getByText('Nature')).toBeTruthy();
  });
});
