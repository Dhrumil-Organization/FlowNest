import { Platform, useWindowDimensions } from 'react-native';

export const DESKTOP_BREAKPOINT = 1180;
export const TABLET_BREAKPOINT = 768;

export function useDashboardResponsive() {
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
  const isMobile = width < TABLET_BREAKPOINT;
  const horizontalPadding = isDesktop ? 24 : isTablet ? 18 : 12;
  const contentMaxWidth = isDesktop ? 1220 : width;

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
