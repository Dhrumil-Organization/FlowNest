// src/theme.ts
// src/theme.ts
export const theme = {
    // darker, professional brand (deep teal/cyan)
    BRAND_GRADIENT_START: '#007EA7', // deep cyan
    BRAND_GRADIENT_END:   '#005F73', // deeper teal
    BRAND_PRIMARY: '#008FAF',        // mid-brand for subtle fills
    BRAND_ACCENT:  '#00B4A2',        // accent (CTA)
    BRAND_ACCENT_LIGHT:  '#00E095',        // accent (CTA)
    BRAND_DARK:    '#0B2130',        // dark title color
    NEUTRAL_BG:    '#F3F5F7',        // app background
    SURFACE:       '#ffffff',        // card surface
    MUTED:         '#7D8790',        // secondary text
    ERROR:         '#D32F2F',
    SUCCESS:       '#2E7D32',
    SHADOW:        'rgba(11,33,48,0.08)',
    OVERLAY:       'rgba(0,0,0,0.04)',
    TEXT_PRIMARY:  '#0B2130',
    TEXT_SECONDARY:'#46515A',
    TEXT_WHITE:'#F6F8FA',
    BORDER: 'rgba(0,0,0,0.06)',
    FONT_FAMILY_REGULAR: 'Poppins-Regular',
    FONT_FAMILY_BOLD: 'Poppins-Bold',
    FONT_FAMILY_ITALIC: 'Poppins-Italic',
    FONT_FAMILY_SEMIBOLD: 'Poppins-SemiBold',
    FONT_FAMILY_MEDIUM: 'Poppins-Medium',
    FONT_FAMILY_LIGHT: 'Poppins-Light',
    FONT_FAMILY_THIN: 'Poppins-Thin',
    FONT_FAMILY_EXTRALIGHT: 'Poppins-ExtraLight',
    FONT_FAMILY_EXTRABOLD: 'Poppins-ExtraBold',
    FONT_FAMILY_BLACK: 'Poppins-Black',
    FONT_FAMILY_EXTRABOLD_ITALIC: 'Poppins-ExtraBoldItalic',
    FONT_FAMILY_BOLD_ITALIC: 'Poppins-BoldItalic',
    FONT_FAMILY_MEDIUM_ITALIC: 'Poppins-MediumItalic',
    FONT_FAMILY_REGULAR_ITALIC: 'Poppins-RegularItalic',
    FONT_FAMILY_SEMIBOLD_ITALIC: 'Poppins-SemiBoldItalic',
    FONT_FAMILY_THIN_ITALIC: 'Poppins-ThinItalic',
    
    
  };
  
  export default theme;


  export const lightTheme = {
    mode: 'light',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#111827',
    subText: '#6B7280',
    border: '#E5E7EB',
    primary: '#5B2EA6',
    danger: '#EF4444',
    shadow: '#000',
  };
  
  export const darkTheme = {
    mode: 'dark',
    background: '#0B1220',
    card: '#121A2B',
    text: '#F9FAFB',
    subText: '#9CA3AF',
    border: '#273244',
    primary: '#8B5CF6',
    danger: '#F87171',
    shadow: '#000',
  };
  
  export type AppTheme = typeof lightTheme;
  
  
  

//   Primary gradient (brand):

// BRAND_GRADIENT_START = #00B8FF (bright cyan)

// BRAND_GRADIENT_END = #00E095 (teal/green)

// Core tokens:

// BRAND_PRIMARY = #00C2E8 (single-brand base, mid between start/end)

// BRAND_ACCENT = #00E095 (accent / CTA)

// BRAND_DARK = #0F2A3A (deep slate for titles)

// NEUTRAL_BG = #F6F8FA (soft app background)

// SURFACE = #FFFFFF (cards / surfaces)

// MUTED = #8B95A6 (subtext / secondary text)

// ERROR = #E53935 (alerts)

// SUCCESS = #2E7D32 (success)

// Shadows & elevation:

// use subtle dark rgba: shadowColor = 'rgba(15, 42, 58, 0.08)'

// hover / pressed overlay: overlay = 'rgba(0,0,0,0.04)'

// Typography colors:

// TEXT_PRIMARY = #0F2A3A

// TEXT_SECONDARY = #44515A