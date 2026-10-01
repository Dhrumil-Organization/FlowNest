import { Platform, useWindowDimensions } from 'react-native';

/**
 * Ek hi jagah se saare screens ke breakpoints control honge.
 *
 *  width < 600      -> Mobile   : 1 card / row
 *  600  - 899       -> Tablet   : 2 cards / row
 *  900  - 1279      -> Laptop   : 3 cards / row
 *  >= 1280          -> Big screen: 4 cards / row
 */
export const BREAKPOINTS = { tablet: 600, desktop: 900, wide: 1280 };

// Content is centred & capped so it never stretches edge-to-edge on a monitor.
export const MAX_CONTENT_WIDTH = 1400; // browse list
export const MAX_FORM_WIDTH = 820; // detail / carton forms

export const useResponsive = () => {
    const { width, height } = useWindowDimensions();

    const isTablet = width >= BREAKPOINTS.tablet;
    const isDesktop = width >= BREAKPOINTS.desktop;
    const isWide = width >= BREAKPOINTS.wide;

    // cards per row for browse list / carton list
    const columns = isWide ? 4 : isDesktop ? 3 : isTablet ? 2 : 1;

    return {
        width,
        height,
        isMobile: !isTablet,
        isTablet,
        isDesktop,
        isWide,
        isWeb: Platform.OS === 'web',
        columns,
        // side gap of the page
        pagePadding: isDesktop ? 20 : isTablet ? 14 : 10,
        // gap between cards
        gap: isDesktop ? 16 : 12,
    };
};

// Soft shadow that works on Android (elevation), iOS (shadow*) and Web (boxShadow)
export const cardShadow: any = Platform.select({
    web: { boxShadow: '0 2px 10px rgba(15, 23, 42, 0.08)' },
    ios: {
        shadowColor: '#0f172a',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    default: { elevation: 3 },
});

// Centered wrapper style used by every screen
export const centered = (maxWidth: number): any => ({
    width: '100%',
    maxWidth,
    alignSelf: 'center',
});
