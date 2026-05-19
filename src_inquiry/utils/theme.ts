// Centralised theme tokens. Tweak to match your brand.
export const colors = {
  // Primary palette
  primary: '#1a1a1a',
  primaryLight: '#333',
  white: '#ffffff',
  black: '#000000',

  // Backgrounds
  bg: '#f5f5f5',
  bgSecondary: '#fafafa',
  cardBg: '#ffffff',

  // Text
  textPrimary: '#1a1a1a',
  textSecondary: '#666',
  textTertiary: '#999',
  textOnPrimary: '#ffffff',

  // Borders
  border: '#e5e5e5',
  borderStrong: '#ccc',

  // Semantic
  info: '#185FA5',
  infoBg: '#E6F1FB',
  success: '#0F6E56',
  successBg: '#E1F5EE',
  warning: '#854F0B',
  warningBg: '#FAEEDA',
  danger: '#A32D2D',
  dangerBg: '#FCEBEB',
  purple: '#3C3489',
  purpleBg: '#EEEDFE',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
};

// Map inquiry status -> badge colors
export const statusColors: Record<
  string,
  {bg: string; fg: string; label: string}
> = {
  pending_costing: {
    bg: colors.warningBg,
    fg: colors.warning,
    label: 'Pending Cost',
  },
  costed: {bg: colors.successBg, fg: colors.success, label: 'Costed'},
  sent: {bg: colors.purpleBg, fg: colors.purple, label: 'Sent'},
  confirmed: {bg: colors.infoBg, fg: colors.info, label: 'Confirmed'},
  rejected: {bg: colors.dangerBg, fg: colors.danger, label: 'Rejected'},
};
