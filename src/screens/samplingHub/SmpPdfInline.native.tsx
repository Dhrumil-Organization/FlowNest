// FILE: src/screens/samplingHub/SmpPdfInline.native.tsx  (Android / iPhone — the web build uses SmpPdfInline.tsx)
// The sticker PDF from the print server, drawn inside the card with react-native-pdf (already in the app build:
// Sales Order PdfViewerScreen). If that native module is missing in a build, the card says so and the full-screen
// preview ("Open sticker PDF") still works.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { T } from '@/src/theme';

let Pdf: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Pdf = require('react-native-pdf').default;
} catch {
  Pdf = null;
}

export const pdfData = (b64: string) => String(b64 || '').replace(/^data:application\/pdf;base64,/, '');

export function SmpPdfInline({ pdfBase64, height }: { pdfBase64: string; height: number }) {
  const [err, setErr] = useState('');
  if (!Pdf) return <Text style={{ color: T.muted, fontSize: 12 }}>This app build cannot draw PDFs inside the screen — use “Full screen”.</Text>;
  if (err) return <Text style={{ color: T.red, fontSize: 12 }}>{err}</Text>;
  return (
    <View style={{ height, borderRadius: 8, overflow: 'hidden', backgroundColor: '#525659' }}>
      <Pdf
        source={{ uri: 'data:application/pdf;base64,' + pdfData(pdfBase64) }}
        style={{ flex: 1, width: '100%', backgroundColor: '#525659' }}
        fitPolicy={0}
        spacing={6}
        trustAllCerts={false}
        onError={(e: any) => setErr('The preview could not be drawn: ' + String(e?.message || e || ''))}
      />
    </View>
  );
}
