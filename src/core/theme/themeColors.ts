// ─────────────────────────────────────────────────────────────
// FILE: src/core/theme/themeColors.ts
//
// DARK THEME colour rules — pure functions, no React / React Native.
//
// Every screen of the project is written for the LIGHT theme: either with the
// theme tokens (T.bg, T.surface, T.ink … from src/constants/theme.ts) or with
// colours typed straight into the styles. The dark theme does not edit those
// screens. Instead, while the dark theme is on, every style is passed through
// the functions below right before it is drawn (see themeRuntime.ts):
//
//   1. a colour that IS a light theme token gets the matching dark token
//      (DARK_TOKENS below — the designed dark palette);
//   2. any other colour is converted by role:
//        background  light greys / white  -> dark surfaces
//                    light tinted (pastel) -> deep tint of the same hue
//                    dark / mid colours    -> unchanged (buttons, headers, chips)
//        text / icon dark                  -> light (same hue, readable)
//                    light                 -> unchanged (text on buttons)
//        border      light                 -> dark line
//                    near black            -> visible grey line
//
// Converting a colour twice gives the same result as converting it once
// (a style can pass through more than one component on its way to the
// screen), and anything that cannot be read as a colour is returned as is.
// ─────────────────────────────────────────────────────────────

export type ColorRole = 'bg' | 'text' | 'border' | 'fill' | 'stroke';

/** Light token value (upper-case hex) -> dark value, per role. */
type TokenMap = Record<string, string>;

/**
 * The dark palette, keyed by the LIGHT token it replaces.
 * Light values are the ones in src/constants/theme.ts (T).
 */
export const DARK = {
  bg: '#0F1318', // page
  surface: '#181D24', // cards, sheets, inputs
  sub: '#141920', // toolbars / quiet panels
  alt: '#232A34', // chips, read-only fields, pressed
  border: '#2C3440',
  hair: '#252C36',
  nav: '#22384F', // header, primary button
  ink: '#ECE8E3', // main text
  navText: '#DCE4EE', // titles (T.nav used as text)
  muted: '#A19C96',
  copper: '#E08A45',
  yd: '#62AEDB',
  pd: '#E2905A',
  green: '#63C194',
  red: '#F0766A',
  amber: '#E7AE45',
  blue: '#86A6E6',
  purple: '#BC84DC',
} as const;

const BG_TOKENS: TokenMap = {
  '#F5F2EE': DARK.bg,
  '#FFFFFF': DARK.surface,
  '#F8F5F1': DARK.sub,
  '#F0EDE8': DARK.alt,
  '#E5E0DA': DARK.border,
  '#EFEAE4': DARK.hair,
  '#0D1B2A': DARK.nav,
};

const TEXT_TOKENS: TokenMap = {
  '#1A1514': DARK.ink,
  '#0D1B2A': DARK.navText,
  '#9A9590': DARK.muted,
  '#C87533': DARK.copper,
  '#1C567A': DARK.yd,
  '#9A4A10': DARK.pd,
  '#2A6044': DARK.green,
  '#B23A2A': DARK.red,
  '#C98A1A': DARK.amber,
  '#3A568A': DARK.blue,
  '#652880': DARK.purple,
};

const BORDER_TOKENS: TokenMap = {
  '#E5E0DA': DARK.border,
  '#EFEAE4': DARK.hair,
  '#F0EDE8': DARK.border,
  '#0D1B2A': '#40536A',
  '#1A1514': '#4A5361',
};

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

type Rgba = { r: number; g: number; b: number; a: number; form: 'hex' | 'rgb' };

const NAMED: Record<string, string> = {
  white: '#FFFFFF',
  black: '#000000',
  gray: '#808080',
  grey: '#808080',
  silver: '#C0C0C0',
  lightgray: '#D3D3D3',
  lightgrey: '#D3D3D3',
  darkgray: '#A9A9A9',
  darkgrey: '#A9A9A9',
  dimgray: '#696969',
  dimgrey: '#696969',
  whitesmoke: '#F5F5F5',
  gainsboro: '#DCDCDC',
  red: '#FF0000',
  green: '#008000',
  blue: '#0000FF',
  orange: '#FFA500',
  yellow: '#FFFF00',
  purple: '#800080',
  navy: '#000080',
  teal: '#008080',
  maroon: '#800000',
  brown: '#A52A2A',
  pink: '#FFC0CB',
  gold: '#FFD700',
};

function parseHex(hex: string): Rgba | null {
  const h = hex.slice(1);
  if (!/^[0-9a-fA-F]+$/.test(h)) return null;
  if (h.length === 3 || h.length === 4) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    const a = h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1;
    return { r, g, b, a, form: 'hex' };
  }
  if (h.length === 6 || h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a, form: 'hex' };
  }
  return null;
}

const RGB_RE = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i;

export function parseColor(input: string): Rgba | null {
  const s = input.trim();
  if (!s) return null;
  if (s[0] === '#') return parseHex(s);
  const m = RGB_RE.exec(s);
  if (m) {
    let a = 1;
    if (m[4] !== undefined) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    const r = Math.round(parseFloat(m[1]));
    const g = Math.round(parseFloat(m[2]));
    const b = Math.round(parseFloat(m[3]));
    if ([r, g, b, a].some((n) => !Number.isFinite(n))) return null;
    return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: clamp(a, 0, 1), form: 'rgb' };
  }
  const named = NAMED[s.toLowerCase()];
  return named ? parseHex(named) : null;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const hex2 = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0').toUpperCase();

function format(c: Rgba): string {
  if (c.form === 'rgb') {
    return c.a >= 1 ? `rgb(${c.r},${c.g},${c.b})` : `rgba(${c.r},${c.g},${c.b},${Math.round(c.a * 1000) / 1000})`;
  }
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${c.a >= 1 ? '' : hex2(c.a * 255)}`;
}

const baseHex = (c: Rgba) => `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;

/* ------------------------------------------------------------------ */
/* HSL                                                                 */
/* ------------------------------------------------------------------ */

type Hsl = { h: number; s: number; l: number };

function toHsl(c: { r: number; g: number; b: number }): Hsl {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h / 6, s, l };
}

function hue(p: number, q: number, t: number) {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}

function fromHsl(hsl: Hsl): { r: number; g: number; b: number } {
  const { h, s, l } = hsl;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue(p, q, h + 1 / 3) * 255),
    g: Math.round(hue(p, q, h) * 255),
    b: Math.round(hue(p, q, h - 1 / 3) * 255),
  };
}

/* ------------------------------------------------------------------ */
/* Role rules                                                          */
/* ------------------------------------------------------------------ */

/** Below this saturation a colour is treated as a grey. */
const NEUTRAL_S = 0.16;
/** The slight blue-grey cast of the dark surfaces (so greys match DARK.surface). */
const SURFACE_HUE = 0.6;
const SURFACE_SAT = 0.18;

/** Same alpha and notation as `c`, new red / green / blue. */
const withRgb = (c: Rgba, rgb: { r: number; g: number; b: number }): Rgba => ({ r: rgb.r, g: rgb.g, b: rgb.b, a: c.a, form: c.form });

const linear = (v: number) => {
  const x = v / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};
const lumOf = (c: { r: number; g: number; b: number }) =>
  0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
/**
 * Luminance text is checked against: #262F38, a little lighter than every
 * common dark surface (page, card, toolbar, chip, converted light greys), so
 * text that passes here reads on all of them.
 */
const SURFACE_LUM = lumOf({ r: 0x26, g: 0x2f, b: 0x38 });
/** WCAG AA for body text. */
const READABLE = 4.5;
const readsOnSurface = (c: { r: number; g: number; b: number }) => (lumOf(c) + 0.05) / (SURFACE_LUM + 0.05) >= READABLE;

/** Opaque text / icon colour. */
function textRule(c: Rgba): Rgba {
  // already readable on a dark surface (white on a button, a pale label): keep
  if (readsOnSurface(c)) return c;
  const hsl = toHsl(c);
  // greys, and "ink" colours (a very dark navy / brown is used as black text —
  // HSL saturation means little that close to black)
  if (hsl.s < NEUTRAL_S || hsl.l < 0.2) {
    // black -> near white, mid grey -> lighter grey
    return withRgb(c, fromHsl({ h: hsl.h, s: Math.min(hsl.s, 0.12), l: Math.max(0.7, 0.92 - hsl.l * 0.5) }));
  }
  // coloured text: keep the hue, lift it until it reads on a dark surface
  const s = Math.min(hsl.s, 0.78);
  let l = Math.max(hsl.l, 0.6);
  let rgb = fromHsl({ h: hsl.h, s, l });
  while (!readsOnSurface(rgb) && l < 0.94) {
    l += 0.03;
    rgb = fromHsl({ h: hsl.h, s, l });
  }
  return withRgb(c, rgb);
}

/** Opaque background colour. */
function bgRule(c: Rgba): Rgba {
  const hsl = toHsl(c);
  if (hsl.l < 0.55) return c; // dark / mid: buttons, headers, status chips
  // "grey" for a light colour = almost no difference between its channels
  // (an off-white page such as #F5F7FB has a high HSL saturation but no real tint)
  const chroma = (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
  if (hsl.s < NEUTRAL_S || chroma < 0.045) {
    // Same order as the designed tokens:
    //   white            -> card surface
    //   off-white (page) -> a little darker than the card
    //   light grey (chip, read-only field) -> lifted above the card
    let l: number;
    if (hsl.l >= 0.985) l = 0.115;
    else if (hsl.l >= 0.93) l = 0.078 + ((hsl.l - 0.93) / 0.055) * 0.026;
    else l = 0.15 + (0.93 - hsl.l) * 0.32;
    return withRgb(c, fromHsl({ h: SURFACE_HUE, s: SURFACE_SAT, l }));
  }
  // pastel / bright fill: deep tint of the same hue
  const l = 0.17 + (1 - hsl.l) * 0.2;
  return withRgb(c, fromHsl({ h: hsl.h, s: Math.min(hsl.s * 0.62, 0.55), l }));
}

/** Opaque border / divider colour. */
function borderRule(c: Rgba): Rgba {
  const hsl = toHsl(c);
  if (hsl.l >= 0.55) {
    if (hsl.s < NEUTRAL_S) {
      return withRgb(c, fromHsl({ h: SURFACE_HUE, s: SURFACE_SAT, l: 0.2 + (1 - hsl.l) * 0.26 }));
    }
    return withRgb(c, fromHsl({ h: hsl.h, s: Math.min(hsl.s * 0.7, 0.6), l: 0.34 }));
  }
  if (hsl.l < 0.16 && hsl.s < 0.6) {
    // black / near-black line would vanish on a dark surface
    return withRgb(c, fromHsl({ h: hsl.s < NEUTRAL_S ? SURFACE_HUE : hsl.h, s: Math.min(hsl.s, 0.25), l: 0.36 }));
  }
  return c;
}

function convert(color: string, role: ColorRole): string {
  const c = parseColor(color);
  if (!c) return color;
  if (c.a === 0) return color;

  const key = baseHex(c);

  if (role === 'text' || role === 'fill') {
    const token = TEXT_TOKENS[key];
    if (token) return format(withRgb(c, parseHex(token)!));
    return format(textRule(c));
  }

  if (role === 'bg') {
    if (c.a < 0.6) {
      // translucent: an overlay or a tint.
      const hsl = toHsl(c);
      if (hsl.l >= 0.55) return color; // light veil / highlight: fine on dark too
      if (c.a >= 0.25) return color; // dark scrim behind a sheet, strong colour wash
      // a soft tint of a (dark or brand) colour: use its readable variant so it still shows
      const token = TEXT_TOKENS[key];
      return format(token ? withRgb(c, parseHex(token)!) : textRule(c));
    }
    // (nearly) solid panels follow the solid rules and keep their alpha
    const token = BG_TOKENS[key];
    if (token) return format(withRgb(c, parseHex(token)!));
    return format(bgRule(c));
  }

  // border / stroke
  if (c.a < 1) {
    const hsl = toHsl(c);
    if (hsl.l >= 0.55) return color;
    const token = TEXT_TOKENS[key];
    return format(token ? withRgb(c, parseHex(token)!) : textRule(c));
  }
  const token = BORDER_TOKENS[key];
  if (token) return format(withRgb(c, parseHex(token)!));
  if (role === 'stroke') {
    // chart lines: a near-black line becomes a readable one, a pale grey track
    // becomes a dark track, coloured lines keep their colour
    const hsl = toHsl(c);
    const grey = hsl.s < NEUTRAL_S;
    if (hsl.l < 0.16) {
      return format(withRgb(c, fromHsl({ h: grey ? SURFACE_HUE : hsl.h, s: 0.12, l: 0.66 })));
    }
    if (grey && hsl.l >= 0.8) return format(borderRule(c));
    return format(c);
  }
  return format(borderRule(c));
}

const cache: Record<ColorRole, Map<string, string>> = {
  bg: new Map(),
  text: new Map(),
  border: new Map(),
  fill: new Map(),
  stroke: new Map(),
};

/** The dark-theme version of `color` when it is used in `role`. */
export function darkColor(color: string, role: ColorRole): string {
  const map = cache[role];
  const hit = map.get(color);
  if (hit !== undefined) return hit;
  let out = color;
  try {
    out = convert(color, role);
  } catch {
    out = color;
  }
  if (map.size > 4000) map.clear();
  map.set(color, out);
  return out;
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

/** Style keys that hold a colour, and the role each one plays. */
export const STYLE_COLOR_KEYS: Record<string, ColorRole> = {
  backgroundColor: 'bg',
  color: 'text',
  tintColor: 'text',
  textDecorationColor: 'text',
  borderColor: 'border',
  borderTopColor: 'border',
  borderRightColor: 'border',
  borderBottomColor: 'border',
  borderLeftColor: 'border',
  borderStartColor: 'border',
  borderEndColor: 'border',
  borderBlockColor: 'border',
  borderBlockStartColor: 'border',
  borderBlockEndColor: 'border',
  borderInlineColor: 'border',
  borderInlineStartColor: 'border',
  borderInlineEndColor: 'border',
  outlineColor: 'border',
};

const STYLE_KEYS = Object.keys(STYLE_COLOR_KEYS);
const converted = new WeakMap<object, any>();

function darkStyleObject(style: any): any {
  const hit = converted.get(style);
  if (hit !== undefined) return hit;
  let out: any = style;
  for (let i = 0; i < STYLE_KEYS.length; i++) {
    const key = STYLE_KEYS[i];
    const value = style[key];
    if (typeof value !== 'string') continue; // numbers, animated values, undefined
    const next = darkColor(value, STYLE_COLOR_KEYS[key]);
    if (next !== value) {
      if (out === style) out = { ...style };
      out[key] = next;
    }
  }
  converted.set(style, out);
  // a converted style is already dark: converting it again must not touch it
  if (out !== style) converted.set(out, out);
  return out;
}

/**
 * The dark-theme version of a style prop (object, array of styles, nested
 * arrays, falsy entries). Objects that hold no convertible colour are
 * returned unchanged — same reference — so animated / library style objects
 * keep their identity.
 */
export function darkStyle(style: any): any {
  if (!style || typeof style !== 'object') return style;
  if (Array.isArray(style)) {
    let out: any[] | null = null;
    for (let i = 0; i < style.length; i++) {
      const item = style[i];
      const next = darkStyle(item);
      if (next !== item) {
        if (!out) out = style.slice();
        out[i] = next;
      }
    }
    return out || style;
  }
  // plain style objects only (class instances such as Animated nodes are left alone)
  const proto = Object.getPrototypeOf(style);
  if (proto !== Object.prototype && proto !== null) return style;
  return darkStyleObject(style);
}

/* ------------------------------------------------------------------ */
/* Contrast (used by the tests)                                        */
/* ------------------------------------------------------------------ */

const lin = (v: number) => {
  const x = v / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};

export function luminance(color: string): number {
  const c = parseColor(color);
  if (!c) return 0;
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
