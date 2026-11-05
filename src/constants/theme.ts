// ─────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF THEME TRUTH.
// Previously this project had two theme files (this one, and
// `src/theme.ts`) that had drifted apart — different color sets and
// different font token shapes. `src/theme.ts` is now just a thin
// re-export of this file (see that file's comment) so every existing
// `from '../../theme'` / `from '@/src/theme'` / `from '@/src/constants/theme'`
// import keeps working unchanged, but there is only one place to edit.
// ─────────────────────────────────────────────────────────────────────────
export const T = {
  nav:      '#0D1B2A',
  bg:       '#F5F2EE',
  surface:  '#FFFFFF',
  border:   '#E5E0DA',
  muted:    '#9A9590',
  sub:      '#F8F5F1',
  alt:      '#F0EDE8',
  ink:      '#1A1514',
  hair:     '#EFEAE4',
  copper:   '#C87533',
  yd:       '#1C567A',
  pd:       '#9A4A10',
  green:    '#2A6044',
  red:      '#B23A2A',
  amber:    '#C98A1A',
  blue:     '#3A568A',
  purple:   '#652880',
  // Kept alongside FONTS below for back-compat with call sites that read
  // T.fontUI / T.fontMono directly instead of importing FONTS.
  fontUI:   'System',
  fontMono: 'Courier',
} as const

// NEW ERP UI font = Inter (bundled, applied automatically — src/core/fonts/erpFont.tsx).
export const FONTS = {
  sans: 'Inter-Regular',
  mono: 'DMMono',
} as const

export const S = {
  card: {
    shadowColor: '#1A1514',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  sheet: {
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
} as const
