import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from '../../components/layout/BottomSheet';
import { T } from '../../theme';

interface Item { k: string; label: string; sub?: string; right?: string }
interface Props {
  open: boolean; onClose: () => void; title: string
  items: Item[]; onPick: (k: string) => void; search?: boolean
}

export function PickerSheet({ open, onClose, title, items, onPick, search=true }: Props) {
  const [q, setQ] = useState('')
  const list = q ? items.filter(it => (it.label+' '+(it.sub||'')).toLowerCase().includes(q.toLowerCase())) : items
  return (
    <BottomSheet open={open} onClose={() => { setQ(''); onClose() }} title={title}>
      {search && (
        <View style={s.searchWrap}>
          <TextInput value={q} onChangeText={setQ} placeholder="Search…" placeholderTextColor={T.muted} style={s.search} />
        </View>
      )}
      {list.map(it => (
        <TouchableOpacity key={it.k} onPress={() => { onPick(it.k); setQ(''); onClose() }} style={s.row}>
          <View style={{ flex:1 }}>
            <Text style={s.label}>{it.label}</Text>
            {it.sub && <Text style={s.sub}>{it.sub}</Text>}
          </View>
          {it.right && <Text style={s.right}>{it.right}</Text>}
        </TouchableOpacity>
      ))}
      <View style={{ height:24 }} />
    </BottomSheet>
  )
}

const s = StyleSheet.create({
  searchWrap:{ padding:12, borderBottomWidth:1, borderBottomColor:T.border },
  search:    { backgroundColor:T.sub, borderRadius:10, padding:10, fontSize:14, color:T.ink, fontFamily:'DMSans' },
  row:       { flexDirection:'row', alignItems:'center', padding:14, borderBottomWidth:1, borderBottomColor:T.sub },
  label:     { fontSize:14, fontWeight:'600', color:T.ink, fontFamily:'DMSans' },
  sub:       { fontSize:11, color:T.muted, marginTop:2, fontFamily:'DMSans' },
  right:     { fontSize:12, fontWeight:'700', color:T.copper, fontFamily:'DMSans' },
})

