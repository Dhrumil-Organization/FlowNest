// ─────────────────────────────────────────────────────────────────────────
// This file used to be a second, separately-maintained theme with its own
// color values and font tokens (drifted from `src/constants/theme.ts`).
// It is now just a re-export of the single canonical theme file so every
// existing `from '../../theme'` / `from '@/src/theme'` import across the
// app keeps working unchanged. Edit colors/fonts in
// `src/constants/theme.ts` — not here.
// ─────────────────────────────────────────────────────────────────────────
export { T, S, FONTS } from './constants/theme';
