import { mapWmoWeatherCode } from '../../src/integrations/weather';

describe('WMO weather-code mapping', () => {
  it.each([
    [0, 'Clear'],
    [1, 'Partly cloudy'], [2, 'Partly cloudy'], [3, 'Cloudy'],
    [45, 'Fog'], [48, 'Fog'],
    [51, 'Drizzle'], [53, 'Drizzle'], [55, 'Drizzle'], [56, 'Drizzle'], [57, 'Drizzle'],
    [61, 'Rain'], [63, 'Rain'], [65, 'Rain'], [66, 'Rain'], [67, 'Rain'],
    [71, 'Snow'], [73, 'Snow'], [75, 'Snow'], [77, 'Snow'],
    [80, 'Showers'], [81, 'Showers'], [82, 'Showers'], [85, 'Showers'], [86, 'Showers'],
    [95, 'Thunderstorm'], [96, 'Thunderstorm'], [99, 'Thunderstorm'],
    [42, 'Unknown conditions'],
  ])('maps WMO code %s to %s', (code, condition) => {
    expect(mapWmoWeatherCode(code as number)).toBe(condition);
  });

  it('never maps a current-weather code to typhoon', () => {
    for (let code = 0; code <= 100; code += 1) {
      expect(mapWmoWeatherCode(code).toLocaleLowerCase()).not.toBe('typhoon');
    }
  });
});
