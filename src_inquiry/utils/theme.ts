// Centralised theme tokens.
export const colors = {
  primary: '#1a1a1a',
  primaryLight: '#333',
  white: '#ffffff',
  black: '#000000',

  bg: '#f5f5f5',
  bgSecondary: '#fafafa',
  cardBg: '#ffffff',

  textPrimary: '#1a1a1a',
  textSecondary: '#666',
  textTertiary: '#999',
  textOnPrimary: '#ffffff',

  border: '#e5e5e5',
  borderStrong: '#ccc',
  // borderLight: '#f5f5f5',
  borderLight: '#e2e8f0',

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

  // TAT-specific
  tatOnTime: '#0F6E56',
  tatOnTimeBg: '#E1F5EE',
  tatWarning: '#854F0B',
  tatWarningBg: '#FAEEDA',
  tatBreached: '#A32D2D',
  tatBreachedBg: '#FCEBEB',
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

export const tatColors: Record<
  string,
  {bg: string; fg: string; label: string; icon: string}
> = {
  on_time: {
    bg: colors.tatOnTimeBg,
    fg: colors.tatOnTime,
    label: 'On Time',
    icon: '✓',
  },
  warning: {
    bg: colors.tatWarningBg,
    fg: colors.tatWarning,
    label: 'Warning',
    icon: '⚠',
  },
  breached: {
    bg: colors.tatBreachedBg,
    fg: colors.tatBreached,
    label: 'Breached',
    icon: '✗',
  },
  not_applicable: {
    bg: '#f0f0f0',
    fg: '#999',
    label: 'N/A',
    icon: '–',
  },
};
