import { getCarouselCardWidth, scrollToMeasuredSection } from '../screens/DiscoverScreen';

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
