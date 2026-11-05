import { createContext, useContext } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

export const DESKTOP_BREAKPOINT = 1180;
export const TABLET_BREAKPOINT = 768;

/** Screens up to about this width are phones: the "Responsive" switch is not shown there. */
export const DASHBOARD_MOBILE_WIDTH = 430;

/**
 * true inside the dashboard when the user picked "Responsive: No": every card that asks
 * useDashboardResponsive() gets the MOBILE layout answer (no desktop / tablet styles), while the
 * width stays the real full width — the dashboard is one column across the whole screen.
 */
export const DashboardForceMobileContext = createContext(false);

export function useDashboardResponsive() {
  const window = useWindowDimensions();
  const forceMobile = useContext(DashboardForceMobileContext);
  const width = window.width;
  const height = window.height;
  const isDesktop = !forceMobile && Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const isTablet = !forceMobile && width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
  const isMobile = forceMobile || width < TABLET_BREAKPOINT;
  const horizontalPadding = isDesktop ? 24 : isTablet ? 18 : 12;
  const contentMaxWidth = isDesktop ? 1220 : width;   // No: full width

  return {
    width,
    height,
    isDesktop,
    isTablet,
    isMobile,
    horizontalPadding,
    contentMaxWidth,
  };
}
