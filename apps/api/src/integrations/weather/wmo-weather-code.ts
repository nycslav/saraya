export type WeatherCondition =
  | 'Clear'
  | 'Partly cloudy'
  | 'Cloudy'
  | 'Fog'
  | 'Drizzle'
  | 'Rain'
  | 'Snow'
  | 'Showers'
  | 'Thunderstorm'
  | 'Unknown conditions';

export function mapWmoWeatherCode(code: number): WeatherCondition {
  if (code === 0) return 'Clear';
  if (code === 1 || code === 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67].includes(code)) return 'Rain';
  if ([71, 73, 75, 77].includes(code)) return 'Snow';
  if ([80, 81, 82, 85, 86].includes(code)) return 'Showers';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Unknown conditions';
}
