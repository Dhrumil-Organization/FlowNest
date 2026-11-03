// FILE: src/components/SalesChallanPackingSlipNEW/PartyField.tsx
// Party help: one accountbasic load per context, strict local search, no repeated
// rows or stale ServerPicker pages. Selecting still uses accountget/getlimit.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { LinkBtn, PickerField, tab, u } from '../PackingAutomationNEW/ui';
import type { Row } from './api';
import { filterPartyRows, indexPartyRows, partyRowView, pick } from './rules';

export default function PartyField({
  f, locked, busy, error, search, onChoose, onClear, needsConfirm,
}: {
  f: Row; locked?: boolean; busy?: boolean; error?: string;
  search: (q: string, page: number) => Promise<{ rows: Row[]; more: boolean }>;
  /** acccode → resolves true when the party was set. */
  onChoose: (acccode: string) => Promise<boolean> | boolean;
  onClear: () => void;
  needsConfirm: () => Promise<boolean>;
}) {
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [partyRows, setPartyRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [retryNo, setRetryNo] = useState(0);
  const has = !!pick(f, 'ParCode');
  const sub = has ? [pick(f, 'ParCode'), pick(f, 'DCity', 'city'), pick(f, 'GSTIN')].filter(Boolean).join(' · ') : undefined;

  // Only the initial load invokes search(). page 0 requests all cached parties.
  // Subsequent input changes are handled synchronously on the client.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setQuery('');
    setPartyRows([]);
    setLoadError('');
    setLoading(true);
    search('', 0).then(({ rows }) => {
      if (!cancelled) setPartyRows(rows);
    }).catch((e) => {
      if (!cancelled) setLoadError(String(e?.message || 'Could not load parties.'));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, search, retryNo]);

  // Deduplicate by party code before searching, irrespective of server join duplicates.
  // Search only visible, party-specific fields: no MH/SH/address text that may
  // accidentally match unrelated parties.
  const entries = useMemo(() => indexPartyRows(partyRows), [partyRows]);
  const matching = useMemo(() => filterPartyRows(entries, query), [entries, query]);
  const visible = useMemo(() => matching.map((item) => item.row), [matching]);

  const close = () => setOpen(false);
  const choose = async (r: Row) => {
    const code = pick(r, 'acccode', 'AccCode');
    if (!code) return;
    if (has && code !== pick(f, 'ParCode') && !(await needsConfirm())) return;
    close();
    await onChoose(code);
  };

  const modalWidth = Math.min(532, Math.max(300, width - 28));
  const modalHeight = Math.min(600, Math.max(280, height - 42));

  return (
    <View>
      <PickerField
        label="Party"
        required
        icon="search"
        value={has ? pick(f, 'ParName') || `Party ${pick(f, 'ParCode')}` : undefined}
        sub={sub}
        placeholder="Search party name, code, city or GSTIN"
        locked={locked}
        loading={busy}
        error={error}
        onPress={() => setOpen(true)}
      />
      {has && !locked ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: -2 }}>
          <LinkBtn label="Clear party" icon="close" onPress={onClear} />
        </View>
      ) : null}
      {has && (pick(f, 'BAccName') || pick(f, 'DAdd')) ? (
        <View style={{ backgroundColor: T.sub, borderRadius: 12, padding: 12, marginTop: 6, gap: 4 }}>
          {pick(f, 'DAdd') ? (
            <Text style={{ fontSize: 13, color: T.ink, fontWeight: '600' }}>
              {[pick(f, 'DAdd'), pick(f, 'DCity'), pick(f, 'DState'), pick(f, 'DZip')].filter(Boolean).join(', ')}
            </Text>
          ) : null}
          {pick(f, 'BAccName') ? <Text style={[u.code, tab]}>Broker {pick(f, 'BAccName')}{pick(f, 'BAccCode') ? `  ${pick(f, 'BAccCode')}` : ''}</Text> : null}
          {pick(f, 'DueDay') ? <Text style={[u.code, tab]}>Credit {pick(f, 'DueDay')} days{pick(f, 'PanNo') ? `  ·  PAN ${pick(f, 'PanNo')}` : ''}</Text> : null}
        </View>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.48)' }}>
          <Pressable onPress={close} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} accessibilityLabel="Close party search" />
          <View style={{ width: modalWidth, maxHeight: modalHeight, backgroundColor: T.surface, borderRadius: 15, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: T.copper, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>PACKING SLIP</Text>
                <Text style={{ color: T.ink, fontSize: 15, fontWeight: '800' }}>Party</Text>
              </View>
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: T.sub, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={19} color={T.ink} />
              </Pressable>
            </View>
            <View style={{ marginHorizontal: 14, marginTop: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: T.border, borderRadius: 9, paddingHorizontal: 10, minHeight: 38 }}>
              <Icon name="search" size={18} color={T.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Name, code, city or GSTIN"
                placeholderTextColor={T.muted}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Search parties locally"
                style={{ flex: 1, color: T.ink, fontSize: 13, paddingVertical: 7, minWidth: 0 }}
              />
              {query ? <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search"><Icon name="close" size={17} color={T.muted} /></Pressable> : null}
            </View>
            {loading ? (
              <View style={{ padding: 28, gap: 8, alignItems: 'center' }}>
                <ActivityIndicator color={T.copper} />
                <Text style={{ color: T.muted, fontSize: 12 }}>Loading parties…</Text>
              </View>
            ) : loadError ? (
              <View style={{ padding: 18, alignItems: 'center', gap: 12 }}>
                <Text style={{ color: T.red, textAlign: 'center' }}>{loadError}</Text>
                <Pressable onPress={() => setRetryNo((n) => n + 1)} accessibilityRole="button">
                  <Text style={{ color: T.copper, fontWeight: '700' }}>Retry</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={visible}
                keyExtractor={(r, i) => pick(r, 'acccode', 'AccCode') || `party-${i}`}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={15}
                maxToRenderPerBatch={20}
                windowSize={7}
                style={{ height: Math.min(modalHeight - 125, Math.max(100, visible.length * 65)), maxHeight: modalHeight - 125 }}
                contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 8 }}
                ListEmptyComponent={<Text style={{ padding: 22, color: T.muted, textAlign: 'center' }}>No matching parties found.</Text>}
                renderItem={({ item }) => {
                  const v = partyRowView(item);
                  return (
                    <Pressable onPress={() => { void choose(item); }} accessibilityRole="button"
                      style={({ pressed }) => ({ borderBottomWidth: 1, borderBottomColor: T.border, paddingVertical: 11, paddingHorizontal: 6, backgroundColor: pressed ? T.sub : T.surface })}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: T.ink }} numberOfLines={1}>{v.name || v.code}</Text>
                      <Text style={{ fontSize: 10, color: T.muted, marginTop: 3 }} numberOfLines={2}>
                        {[v.code, v.city, v.gstin || 'No GSTIN', v.mh && `MH ${v.mh}`, v.sh && `SH ${v.sh}`].filter(Boolean).join(' · ')}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
