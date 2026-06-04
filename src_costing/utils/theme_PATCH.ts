// ============================================================
// PATCHES FOR src/utils/theme.ts
// ============================================================

// ──────────────────────────────────────────────────────────
// 1) Add purple to colors object (if not already there):
// ──────────────────────────────────────────────────────────
// Inside your `colors` export, add:
//   purple: '#534AB7',
//   purpleBg: '#EEEDFE',

// ──────────────────────────────────────────────────────────
// 2) Update statusColors to include new auth states.
//    REPLACE your existing statusColors with this:
// ──────────────────────────────────────────────────────────
export const statusColors: Record<
  string,
  {bg: string; fg: string; label: string}
> = {
  pending_costing: {
    bg: colors.warningBg,
    fg: colors.warning,
    label: 'Pending Costing',
  },
  awaiting_auth: {
    bg: colors.infoBg,
    fg: colors.info,
    label: 'Awaiting Auth',
  },
  auth_rejected: {
    bg: colors.dangerBg,
    fg: colors.danger,
    label: 'Auth Rejected',
  },
  costed: {
    bg: colors.successBg,
    fg: colors.success,
    label: 'Costed',
  },
  sent: {
    bg: colors.purpleBg || colors.infoBg,
    fg: colors.purple || colors.info,
    label: 'Sent',
  },
  confirmed: {
    bg: colors.successBg,
    fg: colors.success,
    label: 'Confirmed',
  },
  rejected: {
    bg: colors.dangerBg,
    fg: colors.danger,
    label: 'Rejected',
  },
};
