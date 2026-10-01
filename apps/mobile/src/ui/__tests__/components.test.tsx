import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';

import { Button, Chip, DestinationArtwork, Screen } from '../components';

describe('shared UI controls', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it('hides the floating back action while scrolling down and reveals it while scrolling up', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const onPress = jest.fn();
    await render(
      <Screen backAction={{ onPress }} testID="detail-scroll">
        <Text>Long detail content</Text>
      </Screen>,
    );

    const scroll = screen.getByTestId('detail-scroll');
    const container = screen.getByTestId('scroll-aware-back-container');
    expect(container.props.accessibilityElementsHidden).toBe(false);

    fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: 48 } } });
    await waitFor(() => expect(container.props.accessibilityElementsHidden).toBe(true));

    fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: 28 } } });
    await waitFor(() => expect(container.props.accessibilityElementsHidden).toBe(false));

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the floating back action visible when reduced motion is enabled', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(
      <Screen backAction={{ onPress: jest.fn() }} testID="reduced-motion-scroll">
        <Text>Long detail content</Text>
      </Screen>,
    );

    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
    fireEvent.scroll(screen.getByTestId('reduced-motion-scroll'), {
      nativeEvent: { contentOffset: { y: 80 } },
    });
    expect(screen.getByTestId('scroll-aware-back-container').props.accessibilityElementsHidden).toBe(false);
  });

  it('reserves only the back control height beneath the safe area', async () => {
    await render(
      <Screen backAction={{ onPress: jest.fn() }} testID="safe-area-detail-scroll">
        <Text>Detail content</Text>
      </Screen>,
    );

    const style = StyleSheet.flatten(screen.getByTestId('safe-area-detail-scroll').props.contentContainerStyle);
    expect(style.paddingTop).toBe(60);
  });
});
