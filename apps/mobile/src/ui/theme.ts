import { Platform } from 'react-native';

export const colors = {
  background: '#F7FBFD',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  navy: '#17324D',
  muted: '#526B7C',
  blue: '#0BA6DF',
  blueSoft: '#DDF5FD',
  coral: '#EF7722',
  coralSoft: '#FDE7D7',
  yellow: '#FAA533',
  yellowSoft: '#FFF0D1',
  green: '#18825C',
  greenSoft: '#DDF4EA',
  violet: '#7756B3',
  violetSoft: '#ECE6FA',
  border: '#D4DEE3',
  danger: '#B42318',
  dangerSoft: '#FEE4E2',
  white: '#FFFFFF',
  scrim: 'rgba(16, 40, 58, 0.48)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

export const type = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  black: 'Nunito_900Black',
} as const;

export const shadows = {
  card: Platform.select({
    web: { boxShadow: '0 5px 12px rgba(23, 50, 77, 0.08)' },
    default: {
      shadowColor: colors.navy,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 3,
    },
  }),
} as const;
