import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { Button, Chip, DestinationArtwork } from '../components';

describe('shared UI controls', () => {
  it('exposes button semantics and handles presses', async () => {
    const onPress = jest.fn();
    await render(<Button label="Generate my itinerary" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Generate my itinerary' });
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('announces chip selection state', async () => {
    await render(<Chip label="Mindanao" selected />);
    expect(screen.getByRole('button', { name: 'Mindanao', selected: true })).toBeTruthy();
  });

  it('falls back to illustrated artwork when a destination photo fails', async () => {
    await render(
      <DestinationArtwork
        imageUrl="https://example.com/batanes.webp"
        label="Batanes"
        tone="forest"
      />,
    );

    const image = screen.getByLabelText('Batanes destination photograph');
    fireEvent(image, 'error');

    await waitFor(() => {
      expect(screen.getByLabelText('Batanes illustrated destination artwork')).toBeTruthy();
    });
  });
});
