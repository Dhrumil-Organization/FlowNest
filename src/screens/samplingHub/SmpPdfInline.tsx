// FILE: src/screens/samplingHub/SmpPdfInline.tsx  (web — the native build uses SmpPdfInline.native.tsx)
// The sticker PDF from the print server, drawn inside the card (no modal, nothing to tap).
import React, { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import { T } from '@/src/theme';

export const pdfData = (b64: string) => String(b64 || '').replace(/^data:application\/pdf;base64,/, '');

export function SmpPdfInline({ pdfBase64, height }: { pdfBase64: string; height: number }) {
  const url = useMemo(() => {
    if (!pdfBase64 || typeof atob === 'undefined') return '';
    try {
      const bin = atob(pdfData(pdfBase64));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    } catch {
      return '';
    }
  }, [pdfBase64]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  if (!url) return <Text style={{ color: T.red, fontSize: 12 }}>The preview PDF could not be read.</Text>;
  return (
    <View style={{ height, borderRadius: 8, overflow: 'hidden', backgroundColor: '#525659' }}>
      {React.createElement('iframe' as any, {
        src: url + '#toolbar=0&navpanes=0&view=Fit',
        title: 'Sticker preview from the print server',
        style: { width: '100%', height: '100%', border: 0, background: '#fff' },
      })}
    </View>
  );
}
