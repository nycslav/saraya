import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { PhilippinesHeroMap } from '../components/PhilippinesHeroMap';

const allEnabled = {
  Luzon: true,
  Visayas: true,
  Mindanao: true,
} as const;

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

    const visayas = screen.getByRole('button', {
      name: 'Visayas region',
      disabled: true,
    });
    fireEvent.press(visayas);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('raises only the active image layer while its region is pressed', async () => {
    await render(<PhilippinesHeroMap enabled={allEnabled} onSelect={jest.fn()} />);

    const luzonButton = screen.getByRole('button', { name: 'Luzon region' });
    const luzonLayer = screen.getByTestId('map-layer-luzon', { includeHiddenElements: true });
    const visayasLayer = screen.getByTestId('map-layer-visayas', { includeHiddenElements: true });

    fireEvent(luzonButton, 'onPressIn');

    await waitFor(() => expect(luzonLayer).toHaveStyle({
      elevation: 8,
      left: '6.5%',
      top: '0.3%',
    }));
    expect(visayasLayer).toHaveStyle({ elevation: 2 });

    fireEvent(luzonButton, 'onPressOut');
    await waitFor(() => expect(luzonLayer).toHaveStyle({
      elevation: 2,
      left: '6.5%',
      top: '0.3%',
    }));
  });

  it.each([
    ['Luzon', '#59d3ff'],
    ['Visayas', '#ffc849'],
    ['Mindanao', '#fa7074'],
  ] as const)('renders %s as plain matching-colored text', async (region, color) => {
    await render(<PhilippinesHeroMap enabled={allEnabled} onSelect={jest.fn()} />);

    const label = screen.getByTestId(`map-label-${region.toLowerCase()}`);
    const button = screen.getByTestId(`map-region-${region.toLowerCase()}`);

    expect(label).toHaveStyle({ color });
    expect(label).toHaveProp('numberOfLines', 1);
    expect(label).toHaveProp('maxFontSizeMultiplier', 1.3);
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({
      backgroundColor: 'transparent',
    });
  });
});
