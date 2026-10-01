import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { destinationGateway } from '../gateways';
import {
  DiscoverScreen,
  discoverTipCompletedKey,
  getCarouselCardWidth,
  scrollToMeasuredSection,
} from '../screens/DiscoverScreen';

jest.mock('../gateways', () => ({
  destinationGateway: { list: jest.fn() },
}));

const mockGateway = destinationGateway as jest.Mocked<typeof destinationGateway>;

describe('DiscoverScreen map tip', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockGateway.list.mockResolvedValue([]);
  });

  it('floats the borderless map instruction above the tab bar with star-eyed Saraya', async () => {
    await render(<DiscoverScreen />);

    const tip = await screen.findByTestId('discover-tip-float');
    expect(within(tip).getByText('Tap a labeled island group to jump to its destinations.')).toBeTruthy();
    expect(screen.getAllByText('Tap a labeled island group to jump to its destinations.')).toHaveLength(1);
    expect(screen.getByLabelText('Saraya mascot, star expression', { includeHiddenElements: true })).toBeTruthy();
  });

  it('does not show the tip when it was completed on this device', async () => {
    await AsyncStorage.setItem(discoverTipCompletedKey, 'true');

    await render(<DiscoverScreen />);

    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(discoverTipCompletedKey));
    expect(screen.queryByTestId('discover-tip-float')).toBeNull();
  });

  it('hides and remembers the tip after an enabled island group is selected', async () => {
    await render(<DiscoverScreen />);
    await screen.findByTestId('discover-tip-float');

    await fireEvent(screen.getByTestId('destination-section-luzon'), 'layout', {
      nativeEvent: { layout: { y: 640 } },
    });
    await waitFor(() => {
      expect(screen.getByTestId('map-region-luzon').props.accessibilityState.disabled).toBe(false);
    });
    await fireEvent.press(screen.getByTestId('map-region-luzon'));

    expect(screen.queryByTestId('discover-tip-float')).toBeNull();
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(discoverTipCompletedKey, 'true'));
  });

  it('does not dismiss the tip when an island group is not measured yet', async () => {
    await render(<DiscoverScreen />);
    await screen.findByTestId('discover-tip-float');

    await fireEvent.press(screen.getByTestId('map-region-luzon'));

    expect(screen.getByTestId('discover-tip-float')).toBeTruthy();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('still hides the tip when saving its completion fails', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('storage unavailable'));
    await render(<DiscoverScreen />);
    await screen.findByTestId('discover-tip-float');

    await fireEvent(screen.getByTestId('destination-section-visayas'), 'layout', {
      nativeEvent: { layout: { y: 720 } },
    });
    await waitFor(() => {
      expect(screen.getByTestId('map-region-visayas').props.accessibilityState.disabled).toBe(false);
    });
    await fireEvent.press(screen.getByTestId('map-region-visayas'));

    expect(screen.queryByTestId('discover-tip-float')).toBeNull();
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
  });

  it('shows the tip when reading its saved state fails', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('storage unavailable'));

    await render(<DiscoverScreen />);

    expect(await screen.findByTestId('discover-tip-float')).toBeTruthy();
  });
});

describe('DiscoverScreen region scrolling', () => {
  it.each([
    [false, true],
    [true, false],
  ] as const)(
    'scrolls to the measured section when reduced motion is %s',
    (reducedMotion, animated) => {
      const scrollTo = jest.fn();

      scrollToMeasuredSection({ scrollTo }, 640, reducedMotion);

      expect(scrollTo).toHaveBeenCalledWith({ y: 624, animated });
    },
  );

  it('clamps a section offset to the top of the scroll view', () => {
    const scrollTo = jest.fn();

    scrollToMeasuredSection({ scrollTo }, 8, false);

    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });
});

describe('DiscoverScreen destination carousel sizing', () => {
  it.each([
    [320, 256],
    [375, 300],
    [430, 344],
    [768, 440],
    [812, 440],
  ])(
    'uses an 80%% phone width with a wide-screen cap for a %spx viewport',
    (viewportWidth, expectedWidth) => {
      expect(getCarouselCardWidth(viewportWidth)).toBe(expectedWidth);
    },
  );
});
