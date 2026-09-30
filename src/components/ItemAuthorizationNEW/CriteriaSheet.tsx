// FILE: src/components/ItemAuthorizationNEW/CriteriaSheet.tsx
// NEW-theme port of legacy ItemAuthorization/CriteriaForm.tsx: one required
// field "Select Store" (StrName / StrCode from getstore) + "Load Data".
// Load Data: ignored while loading; no store → warning "Please select store";
// otherwise loads the ACTIVE tab (requests / history / verify) and closes.
import { showWarning } from '@/common/utils/snackbar';
import { T } from '@/src/theme';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Btn, SelectField, Sheet, toOpts } from '../StockVerificationNEW/ui';
import { Row } from './model';

type Props = {
  isVisible: boolean;
  onClose: () => void;
  isLoading: boolean;
  strCode: string;
  setStrCode: (v: string) => void;
  stores: Row[];
  storesLoading: boolean;
  onReloadStores: () => void;
  onLoad: (strcode: string) => void;
};

export default function CriteriaSheet({ isVisible, onClose, isLoading, strCode, setStrCode, stores, storesLoading, onReloadStores, onLoad }: Props) {
  const opts = useMemo(() => toOpts(stores, 'StrCode', 'StrName', (r) => `${r.StrCode} ${r.StrName}`), [stores]);

  const handleLoaddata = () => {
    if (isLoading) return;
    if (!strCode) {
      showWarning('Please select store', { text: 'OK', onPress: () => {} });
      return;
    }
    onLoad(strCode);
    onClose();
  };

  return (
    <Sheet
      open={isVisible}
      onClose={onClose}
      eyebrow="CRITERIA"
      title="Select store"
      wideMax={520}
      footer={<Btn label="Load Data" icon="cloud-download" kind="copper" onPress={handleLoaddata} loading={isLoading} style={{ flex: 1 }} />}
    >
      <SelectField
        label="Select Store"
        required
        value={strCode}
        options={opts}
        placeholder="Choose store..."
        loading={storesLoading}
        onRefresh={onReloadStores}
        clearable
        onChange={(v) => setStrCode(v || '')}
      />
      {!storesLoading && stores.length === 0 ? <Text style={c.hint}>No stores data available</Text> : null}
      <View style={c.note}>
        <Text style={c.noteText}>Data is loaded for the tab that is open (Request, History or Verify).</Text>
      </View>
    </Sheet>
  );
}

const c = StyleSheet.create({
  hint: { fontSize: 12, color: T.red, fontWeight: '700' },
  note: { padding: 10, borderRadius: 10, backgroundColor: T.sub, borderWidth: 1, borderColor: T.hair },
  noteText: { fontSize: 12, color: T.muted },
});
