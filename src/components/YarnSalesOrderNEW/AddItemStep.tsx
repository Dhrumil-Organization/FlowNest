// FILE: src/components/YarnSalesOrderNEW/AddItemStep.tsx
// Add New Item (legacy components/YarnSalesOrder/AddNewItemScreen.tsx).
// No API call: the new item travels with ItmCode '-1' / MItmCode '-1' and is sent
// in `newsoitem` of POST /api/mobappsave, where the server creates it.
// Legacy check kept: only the item name is required (Remark is not checked).
import { AppAlert } from '@/common/utils/appAlert';
import { Btn, Card, Field, PanelHeader } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { chooseItem } from './ItemStep';
import { buildNewItem } from './model';
import { Nav, PickFlow } from './nav';
import { CONTENT, FooterBar } from './ui';

type Props = { nav: Nav; flow: PickFlow };

export default function AddItemStep({ nav, flow }: Props) {
  const [itemName, setItemName] = useState('');
  const [remark, setRemark] = useState('');

  const handleSave = () => {
    if (!itemName.trim()) {
      AppAlert.alert('Validation', 'Please enter Item name');
      return;
    }
    chooseItem(nav, flow, buildNewItem(itemName, remark));
  };

  return (
    <View style={st.root}>
      <PanelHeader onBack={nav.back} crumbs={['Yarn Sales Order', 'Select Item']} title="Add New Item" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[CONTENT, st.content]}>
        <Card style={{ gap: 14 }}>
          <Field label="Item Name" required value={itemName} onChangeText={setItemName} placeholder="Enter item name" autoFocus />
          <Field label="Remark" value={remark} onChangeText={setRemark} placeholder="Enter remark" multiline />
          <Text style={st.hint}>The item is created when the sales order is saved.</Text>
        </Card>
      </ScrollView>
      <FooterBar>
        <Btn label="Cancel" kind="ghost" onPress={nav.back} style={{ flex: 1 }} />
        <Btn label="Save Item" icon="check" onPress={handleSave} style={{ flex: 1.4 }} />
      </FooterBar>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 12, maxWidth: 640 },
  hint: { fontSize: 12, fontWeight: '600', color: T.muted },
});
