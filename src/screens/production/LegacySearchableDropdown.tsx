import React, { useMemo, useState } from 'react';
import { FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  data?: any[];
  placeholder?: string;
  labelKey?: string | string[];
  valueKey?: string;
  initialValue?: any;
  selected?: any;
  onSelect?: (item: any) => void;
  setSelected?: (item: any) => void;
  disabled?: boolean;
};

const textFor = (item: any, labelKey?: string | string[]) => {
  if (!item) return '';
  const keys = Array.isArray(labelKey) ? labelKey : [labelKey || 'displayLabel'];
  return keys.map((key) => item?.[key]).filter((value) => value !== undefined && value !== null && String(value).trim() !== '').join(' - ');
};

export default function LegacySearchableDropdown({ data = [], placeholder = 'Select...', labelKey, valueKey = 'id', initialValue, selected, onSelect, setSelected, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = selected || initialValue;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) => textFor(item, labelKey).toLowerCase().includes(q) || String(item?.[valueKey] ?? '').toLowerCase().includes(q));
  }, [data, query, labelKey, valueKey]);

  const choose = (item: any) => {
    onSelect?.(item);
    setSelected?.(item);
    setOpen(false);
    setQuery('');
  };

  return <>
    <TouchableOpacity disabled={disabled} style={[s.trigger, disabled && s.disabled]} onPress={() => setOpen(true)}>
      <Text style={current ? s.value : s.placeholder} numberOfLines={1}>{current ? textFor(current, labelKey) : placeholder}</Text>
      <Text style={s.chevron}>⌄</Text>
    </TouchableOpacity>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={s.modal}>
        <View style={s.header}><Text style={s.title}>{placeholder}</Text><TouchableOpacity onPress={() => setOpen(false)}><Text style={s.close}>✕</Text></TouchableOpacity></View>
        <TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Search..." style={s.search} />
        <FlatList data={rows} keyboardShouldPersistTaps="handled" keyExtractor={(item, index) => `${String(item?.[valueKey] ?? index)}-${index}`} renderItem={({ item }) => <TouchableOpacity style={s.row} onPress={() => choose(item)}><Text style={s.rowText}>{textFor(item, labelKey)}</Text></TouchableOpacity>} ListEmptyComponent={<Text style={s.empty}>No matching records</Text>} />
      </SafeAreaView>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  trigger:{minHeight:46,borderWidth:1,borderColor:'#D6D9DF',borderRadius:10,backgroundColor:'#FFF',paddingHorizontal:12,flexDirection:'row',alignItems:'center'},
  disabled:{opacity:.5}, value:{flex:1,color:'#152033',fontSize:14}, placeholder:{flex:1,color:'#8A9099',fontSize:14}, chevron:{fontSize:20,color:'#6B7280'},
  modal:{flex:1,backgroundColor:'#F7F4EF'}, header:{height:58,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#122033'}, title:{color:'#FFF',fontWeight:'800',fontSize:16},close:{color:'#FFF',fontSize:18},
  search:{margin:14,borderWidth:1,borderColor:'#D6D9DF',borderRadius:10,backgroundColor:'#FFF',paddingHorizontal:12,height:46}, row:{paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#E6E7EA',backgroundColor:'#FFF'},rowText:{color:'#152033',fontSize:14},empty:{padding:24,textAlign:'center',color:'#6B7280'}
});
