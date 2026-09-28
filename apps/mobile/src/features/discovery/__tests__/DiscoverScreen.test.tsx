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
    [320, 248],
    [375, 287],
    [430, 342],
    [768, 360],
  ])('uses an adaptive card width for a %spx viewport', (viewportWidth, expectedWidth) => {
    expect(getCarouselCardWidth(viewportWidth)).toBe(expectedWidth);
  });
});
