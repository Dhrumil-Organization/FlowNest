// FILE: src/components/YarnManagementSystemNEW/PartyStep.tsx
// PARTY step ("Browse Item" of a sub item — legacy PartyTab): map a party's own item name to
// the selected sub item (yarnitemd1add) and list the names already mapped (yarnitemd1browse).
import { S, T } from '@/src/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Btn, EmptyState, Field, PanelHeader, SectionHead } from '../erpUi';
import { labelOf, Row } from './model';
import { SelectOne, useCols, y } from './ui';

type Props = {
  /** Sub item whose party mapping is shown (legacy browseParentItem). */
  item: Row | null;
  partydata: Row[];
  partyForm: Row;
  setPartyForm: (updater: (prev: Row) => Row) => void;
  /** Mapped party items (legacy browserpartydata). */
  rows: Row[];
  onBack: () => void;
  onAdd: () => void;
};

export default function PartyStep({ item, partydata, partyForm, setPartyForm, rows, onBack, onAdd }: Props) {
  const { cols, isPhone } = useCols();
  const cell = isPhone ? { width: '100%' as const } : { flexGrow: 1, flexBasis: '46%' as const, minWidth: 0 };
  const list = Array.isArray(rows) ? rows : [];

  return (
    <View style={y.root}>
      <PanelHeader onBack={onBack} title={`Sub Item: ${item?.WNameCode || '-'}`} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[y.content, { gap: 12 }]}
      >
        <View style={y.card}>
          <View style={y.grid}>
            <SelectOne
              label="Party"
              required
              placeholder="Choose party..."
              data={partydata}
              labelKeys={['accountname', 'acccode']}
              valueKey="acccode"
              value={labelOf(partyForm, ['accountname', 'acccode'])}
              selectedValue={partyForm.acccode}
              style={cell}
              onSelect={(party) => {
                setPartyForm((prev) => ({
                  ...prev,
                  accountname: party.accountname,
                  acccode: party.acccode,
                }));
              }}
            />
            <Field
              label="Item Name"
              required
              placeholder="Main Item..."
              value={partyForm.ItemName || ''}
              style={cell}
              onChangeText={(text: string) =>
                setPartyForm((prev) => ({
                  ...prev,
                  ItemName: text,
                }))
              }
            />
          </View>
          <View style={s.actions}>
            <Btn label="Cancel" icon="cancel" kind="ghost" onPress={onBack} />
            <Btn label="Add Item" icon="add-circle" onPress={onAdd} />
          </View>
        </View>

        <SectionHead title="Item List" />

        {list.length > 0 ? (
          <View style={s.grid}>
            {list.map((row, index) => (
              <View key={index} style={[s.cellWrap, { width: `${100 / cols}%` as any }]}>
                <View style={s.card}>
                  <View style={s.kv}>
                    <Text style={s.k}>Item</Text>
                    <Text style={s.v} numberOfLines={2}>
                      {row?.ItmName}
                    </Text>
                  </View>
                  <View style={s.kv}>
                    <Text style={s.k}>Code</Text>
                    <Text style={s.v} numberOfLines={1}>
                      {row?.ItmCode}
                    </Text>
                  </View>
                  <View style={s.kv}>
                    <Text style={s.k}>Party</Text>
                    <Text style={s.v} numberOfLines={2}>
                      {row?.ParName}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState icon="inbox" title="No Data Found" />
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cellWrap: { padding: 5 },
  card: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    borderLeftWidth: 4,
    borderLeftColor: T.blue,
    padding: 12,
    gap: 4,
    ...S.card,
  },
  kv: { flexDirection: 'row', gap: 8 },
  k: {
    width: 46,
    fontSize: 10.5,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  v: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '700', color: T.ink },
});
