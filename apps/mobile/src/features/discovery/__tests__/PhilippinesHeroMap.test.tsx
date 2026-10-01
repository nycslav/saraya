import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { PhilippinesHeroMap } from '../components/PhilippinesHeroMap';

const allEnabled = {
  Luzon: true,
  Visayas: true,
  Mindanao: true,
} as const;

const stageSize = { width: 377, height: 720 };

function percentage(value: unknown) {
  return Number.parseFloat(String(value)) / 100;
}

function hitZoneBounds(testId: string) {
  const style = StyleSheet.flatten(screen.getByTestId(testId).props.style);

  const left = percentage(style.left) * stageSize.width;
  const top = percentage(style.top) * stageSize.height;
  const width = percentage(style.width) * stageSize.width;
  const height = percentage(style.height) * stageSize.height;

  return { left, top, right: left + width, bottom: top + height, width, height };
}

function overlaps(
  first: ReturnType<typeof hitZoneBounds>,
  second: ReturnType<typeof hitZoneBounds>,
) {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}

describe('PhilippinesHeroMap', () => {
  it.each(['Luzon', 'Visayas', 'Mindanao'] as const)(
    'exposes an independent %s region button',
    async (region) => {
      const onSelect = jest.fn();
      await render(<PhilippinesHeroMap enabled={allEnabled} onSelect={onSelect} />);

      fireEvent.press(screen.getByRole('button', { name: `${region} region` }));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(region);
    },
  );

  it('does not dispatch a disabled region', async () => {
    const onSelect = jest.fn();
    await render(
      <PhilippinesHeroMap
        enabled={{ ...allEnabled, Visayas: false }}
        onSelect={onSelect}
      />,
    );

    const visayasZones = [
      screen.getByTestId('map-region-visayas-zone-0'),
      screen.getByRole('button', {
        name: 'Visayas region',
        disabled: true,
      }),
      screen.getByTestId('map-region-visayas-zone-2'),
    ];

    visayasZones.forEach((zone) => fireEvent.press(zone));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it.each([
    ['map-region-visayas-zone-0', 'Visayas'],
    ['map-region-visayas', 'Visayas'],
    ['map-region-visayas-zone-2', 'Visayas'],
    ['map-region-mindanao-zone-0', 'Mindanao'],
    ['map-region-mindanao', 'Mindanao'],
  ] as const)('%s dispatches only its assigned region', async (testId, region) => {
    const onSelect = jest.fn();
    await render(<PhilippinesHeroMap enabled={allEnabled} onSelect={onSelect} />);

    fireEvent.press(screen.getByTestId(testId));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(region);
  });

  it('keeps every Visayas and Mindanao touch zone separate and at least 48dp', async () => {
    await render(<PhilippinesHeroMap enabled={allEnabled} onSelect={jest.fn()} />);

    const visayasZones = [
      hitZoneBounds('map-region-visayas-zone-0'),
      hitZoneBounds('map-region-visayas'),
      hitZoneBounds('map-region-visayas-zone-2'),
    ];
    const mindanaoZones = [
      hitZoneBounds('map-region-mindanao-zone-0'),
      hitZoneBounds('map-region-mindanao'),
    ];

    [...visayasZones, ...mindanaoZones].forEach((zone) => {
      expect(zone.width).toBeGreaterThanOrEqual(48);
      expect(zone.height).toBeGreaterThanOrEqual(48);
    });

    visayasZones.forEach((visayas) => {
      mindanaoZones.forEach((mindanao) => {
        expect(overlaps(visayas, mindanao)).toBe(false);
      });
    });
  });

  it('keeps the island image layers shadow-free and fixed while pressed', async () => {
    await render(<PhilippinesHeroMap enabled={allEnabled} onSelect={jest.fn()} />);

    const luzonButton = screen.getByRole('button', { name: 'Luzon region' });
    const luzonLayer = screen.getByTestId('map-layer-luzon', { includeHiddenElements: true });
    const visayasLayer = screen.getByTestId('map-layer-visayas', { includeHiddenElements: true });

    expect(StyleSheet.flatten(luzonLayer.props.style)).toMatchObject({
      left: '6.5%',
      top: '0.3%',
    });
    expect(StyleSheet.flatten(luzonLayer.props.style)).not.toHaveProperty('boxShadow');
    expect(StyleSheet.flatten(luzonLayer.props.style)).not.toHaveProperty('elevation');

    fireEvent(luzonButton, 'onPressIn');

    await waitFor(() => expect(luzonLayer).toHaveStyle({
      left: '6.5%',
      top: '0.3%',
    }));
    expect(StyleSheet.flatten(luzonLayer.props.style)).not.toHaveProperty('boxShadow');
    expect(StyleSheet.flatten(luzonLayer.props.style)).not.toHaveProperty('elevation');
    expect(StyleSheet.flatten(luzonLayer.props.style)).not.toHaveProperty('transform');
    expect(StyleSheet.flatten(visayasLayer.props.style)).not.toHaveProperty('boxShadow');
    expect(StyleSheet.flatten(visayasLayer.props.style)).not.toHaveProperty('elevation');

    fireEvent(luzonButton, 'onPressOut');
    await waitFor(() => expect(luzonLayer).toHaveStyle({
      left: '6.5%',
      top: '0.3%',
    }));
  });

  it('keeps Mindanao shadow-free and fixed when its northern segment is pressed', async () => {
    await render(<PhilippinesHeroMap enabled={allEnabled} onSelect={jest.fn()} />);

    const northernMindanao = screen.getByTestId('map-region-mindanao-zone-0');
    const mindanaoLayer = screen.getByTestId('map-layer-mindanao', {
      includeHiddenElements: true,
    });

    fireEvent(northernMindanao, 'onPressIn');

    await waitFor(() =>
      expect(mindanaoLayer).toHaveStyle({
        left: '12%',
        top: '4.5%',
      }),
    );
    expect(StyleSheet.flatten(mindanaoLayer.props.style)).not.toHaveProperty('boxShadow');
    expect(StyleSheet.flatten(mindanaoLayer.props.style)).not.toHaveProperty('elevation');
    expect(StyleSheet.flatten(mindanaoLayer.props.style)).not.toHaveProperty('transform');

    fireEvent(northernMindanao, 'onPressOut');
    await waitFor(() =>
      expect(mindanaoLayer).toHaveStyle({
        left: '12%',
        top: '4.5%',
      }),
    );
  });

  it.each([
    ['Luzon', '#59d3ff'],
    ['Visayas', '#ffc849'],
    ['Mindanao', '#fa7074'],
  ] as const)('renders %s as plain matching-colored text', async (region, color) => {
    await render(<PhilippinesHeroMap enabled={allEnabled} onSelect={jest.fn()} />);

    const label = screen.getByTestId(`map-label-${region.toLowerCase()}`, {
      includeHiddenElements: true,
    });
    const button = screen.getByTestId(`map-region-${region.toLowerCase()}`);

    expect(label).toHaveStyle({ color });
    expect(label).toHaveProp('numberOfLines', 1);
    expect(label).toHaveProp('maxFontSizeMultiplier', 1.3);
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({
      backgroundColor: 'transparent',
    });
  });
});
