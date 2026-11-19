// FILE: src/features/repackingIssue/theme.ts
//
// Repacking Issue styling tokens — built ONLY from the FlowNest light theme (T).
// Do not add dark colours here: FlowNest's runtime theme (src/core/theme) converts
// these light tokens to the dark palette automatically when Dark / System is on.

import { T } from '@/src/theme';

export const C = {
  nav: T.nav, // navy: selected segment, table header, step badge, secondary button, sheet header
  cta: T.copper, // orange: Save / Update / Add item, totals, selection
  ctaSoft: T.copper + '1A',
  bg: T.bg,
  card: T.surface,
  track: T.alt, // segmented-control track, read-only fields
  quiet: T.sub, // zebra rows
  line: T.border,
  hair: T.hair,
  ink: T.ink,
  muted: T.muted,
  danger: T.red,
  dangerSoft: T.red + '14',
  ok: T.green,
  onNav: '#FFFFFF',
  onNavSub: '#8EA6BA',
  overlay: 'rgba(13,27,42,0.55)'
} as const;

export const R = { sm: 8, md: 10, lg: 14 } as const;
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

/** Small uppercase label used across FlowNest forms ("PROPERTY", "YEAR"). */
export const LABEL = {
  fontSize: 11,
  fontWeight: '800' as const,
  color: C.muted,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const
};
