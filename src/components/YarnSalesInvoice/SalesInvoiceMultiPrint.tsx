// FILE: src/components/SalesInvoiceBrowse/SalesInvoiceMultiPrint.tsx
// Entry of the Sales Invoice MULTI PRINT screen: criteria -> Multi Print dialog -> PDF preview.
// (The browse list screen is index.tsx; both share api.ts / model.ts / ui.tsx / the dialog.)
import React, { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { T } from '../../../src/theme';
import MultiPrintStep from './MultiPrintStep';
import PdfStep from './PdfStep';

type Props = { token: string; API: string; username?: string };

export default function SalesInvoiceMultiPrint({ token, API }: Props) {
  const [pdf, setPdf] = useState<{ pdfUrl: string; title: string } | null>(null);

  useEffect(() => {
    if (!pdf) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPdf(null);
      return true;
    });
    return () => sub.remove();
  }, [pdf]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={pdf ? { display: 'none', flex: 1 } : { flex: 1 }}>
        <MultiPrintStep token={token} API={API} onOpenPdf={(pdfUrl, title) => setPdf({ pdfUrl, title })} />
      </View>
      {pdf ? <PdfStep pdfUrl={pdf.pdfUrl} title={pdf.title} onBack={() => setPdf(null)} /> : null}
    </View>
  );
}
