// FILE: src/lib/qr/QrCode.tsx
// <QrCode value="GAR-0001" size={120} /> — draws a QR code with react-native-svg (already in the app), on web and
// phones. Encoder: ./qrEncode (no extra package needed).
import React, { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { Ecc, qrEncode, qrPath } from './qrEncode';

export function QrCode({ value, size = 120, ecc = 'M', quiet = 4, color = '#000', bg = '#fff' }: {
  value: string; size?: number; ecc?: Ecc; quiet?: number; color?: string; bg?: string;
}) {
  const q = useMemo(() => {
    try { return qrEncode(value, ecc); } catch { return null; }
  }, [value, ecc]);
  if (!q) return null;
  const n = q.size + quiet * 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} accessibilityLabel={`QR code ${value}`}>
      <Rect x={0} y={0} width={n} height={n} fill={bg} />
      <Path d={qrPath(q, quiet)} fill={color} />
    </Svg>
  );
}
