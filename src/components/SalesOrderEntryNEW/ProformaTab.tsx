// FILE: src/components/SalesOrderEntryNEW/ProformaTab.tsx
// "Proforma" tab — split an authorized Grey Sales Order into proforma invoices.
// Uses the same property / year as Auth / Tracking / Summary ('selected_prpcode', 'selectedyear').
// The screen itself: src/screens/soProforma/SOProformaScreen.tsx (feature code in src/features/soProforma).
import { T } from '@/src/theme';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import SOProformaScreen from '@/src/screens/soProforma/SOProformaScreen';
import { useSavedPrpCode, useSavedYear } from './savedProperty';

type Props = { token: string; API: string; userid: string };

export default function ProformaTab({ token, userid }: Props) {
  const readPrpCode = useSavedPrpCode(token, userid);
  const readYear = useSavedYear(token, userid);
  const [prp, setPrp] = useState<{ code: string; year: string } | null>(null);

  useEffect(() => {
    (async () => {
      const code = await readPrpCode();
      const year = await readYear('selectedyear');
      setPrp({ code: code || '', year: year ? String(year).slice(-2) : '' });
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!prp) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;
  if (!prp.code || !prp.year) {
    return (
      <View style={s.center}>
        <Text style={s.hint}>Choose the property and year on the New Order tab first.</Text>
      </View>
    );
  }
  return <SOProformaScreen key={`${prp.code}|${prp.year}`} prpCode={prp.code} yearNo={prp.year} />;
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hint: { color: T.muted, fontSize: 14, textAlign: 'center' },
});
