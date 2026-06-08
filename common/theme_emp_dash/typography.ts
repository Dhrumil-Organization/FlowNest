import { Platform } from 'react-native';

export const Typography = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'sans-serif',
  }),

  title: {
    fontSize: 22,
    fontWeight: '700',
  },

  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },

  body: {
    fontSize: 14,
    fontWeight: '500',
  },

  value: {
    fontSize: 18,
    fontWeight: '700',
  },
};