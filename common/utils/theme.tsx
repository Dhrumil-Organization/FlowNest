/**
 * utils/theme.js
 * Direct port of the JSX `T` token object — same hex values, same names,
 * so visuals match the original web app.
 */
export const T = {
  nav: "#13879A",
  bg: "#F5F2EE",
  surface: "#fff",
  border: "#E5E0DA",
  muted: "#000",
  sub: "#F8F5F1",
  alt: "#F0EDE8",
  ink: "#13879A",
  copper: "#13879A",
  yd: "#1C567A",
  pd: "#9A4A10",
  green: "#2A6044",
  red: "#B23A2A",
  amber: "#C98A1A",
  blue: "#3A568A",
  purple: "#652880",
};

export const CATS = ["Linen Shirting", "Sportswear", "Linen Suiting", "Dress Material"];

export const catShort = (c) => (c === "Linen Shirting" ? "Shirting" : c === "Linen Suiting" ? "Suiting" : c);

export const TYPE_CFG = {
  YD: { label: "Yarn-dyed", abbr: "YD", color: T.yd },
  PD: { label: "Piece-dyed", abbr: "PD", color: T.pd },
};

export const num = (x) => {
  const n = parseFloat(x);
  return isFinite(n) ? n : 0;
};

export const rupee0 = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
