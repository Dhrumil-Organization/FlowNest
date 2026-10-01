import { Platform, useWindowDimensions } from 'react-native';

/**
 * Ek hi jagah se saare screen-size rules (breakpoints) control hote hain.
 * Numbers badalne hon to sirf yahin badalna hai.
 *
 *  width < 600        -> Mobile   : cards 1 per row
 *  600  - 1023        -> Tablet   : cards 2 per row
 *  1024 - 1439        -> Desktop  : cards 3 per row
 *  >= 1440            -> Wide     : cards 4 per row
 */
export const BREAKPOINTS = {
    tablet: 600,
    desktop: 1024,
    wide: 1440,
} as const;

export const IS_WEB = Platform.OS === 'web';

export type ResponsiveInfo = {
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    /** true when screen is tablet or bigger (form goes 2 columns) */
    isWideScreen: boolean;
    /** Browse page cards per row */
    listColumns: number;
    /** Small list rows (design items / carton summary) per row */
    itemColumns: number;
    /** Form fields per row */
    formColumns: number;
    /** Max width of the browse page content (centered on big screens) */
    contentMaxWidth: number;
    /** Max width of forms (centered on big screens) */
    formMaxWidth: number;
};

export const useResponsive = (): ResponsiveInfo => {
    const { width, height } = useWindowDimensions();

    const isMobile = width < BREAKPOINTS.tablet;
    const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
    const isDesktop = width >= BREAKPOINTS.desktop;
    const isWideScreen = !isMobile;

    const listColumns =
        width >= BREAKPOINTS.wide ? 4 :
            width >= BREAKPOINTS.desktop ? 3 :
                width >= BREAKPOINTS.tablet ? 2 : 1;

    const itemColumns =
        width >= BREAKPOINTS.desktop ? 3 :
            width >= BREAKPOINTS.tablet ? 2 : 1;

    const formColumns = isMobile ? 1 : 2;

    return {
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        isWideScreen,
        listColumns,
        itemColumns,
        formColumns,
        contentMaxWidth: 1440,
        formMaxWidth: 900,
    };
};

/** RN style ke liye "33.33%" jaisi typed percentage */
export const pct = (n: number) => `${n}%` as `${number}%`;

/** Web par blue focus outline hatane ke liye (native par kuch nahi karta) */
export const webNoOutline: any = IS_WEB ? { outlineStyle: 'none', outlineWidth: 0 } : {};
