import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

export type JobWorkParty = {
  acc_code: string;
  name: string;
  short_name?: string | null;
};

export type MainErpShade = {
  prp_code: string;
  shd_code: number;
  shd_name: string;
  short_name?: string | null;
};

export type DyeingDesign = {
  id: string;
  code: string;
  dsn_code?: string | null;
};

export type DyeingPartyShade = {
  id?: string | number | null;
  party_acc_code: string;
  party_name: string;
  party_shade_no: string;
  erp_shade_code?: string | number | null;
};

export type DyeingColour = {
  id: string | number;
  code?: string | null;
  name: string;
  hex?: string | null;
  maps?: DyeingPartyShade[];
};

export type DyeingMasterApi = {
  listColours: () => Promise<DyeingColour[]>;
  searchMainShades: (search: string) => Promise<MainErpShade[]>;
  searchDesigns: (search: string) => Promise<DyeingDesign[]>;
  searchJobWorkParties: (search: string) => Promise<JobWorkParty[]>;
  saveColour: (payload: {
    name: string;
    hex: string;
    erp_shade_code: number;
    main_design_id: string;
    design_shade_name?: string;
    mappings: Array<{
      party_acc_code: string;
      party_name: string;
      party_shade_no: string;
    }>;
  }) => Promise<any>;
};

type DraftRow = {
  key: string;
  party: JobWorkParty | null;
  partyShadeNo: string;
};

const P = {
  bg: '#F4F1EC',
  surface: '#FFFFFF',
  ink: '#183246',
  muted: '#75818A',
  border: '#DDD7CE',
  nav: '#173A55',
  copper: '#A96C42',
  danger: '#A64A4A',
  soft: '#F8F5F0',
};

const rowKey = () => `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function normalizeHex(v: string) {
  const x = v.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(x)) return x;
  return '#3A568A';
}

function JobWorkPartyPicker({
  visible, value, onClose, onPick, search,
}: {
  visible: boolean;
  value: JobWorkParty | null;
  onClose: () => void;
  onPick: (party: JobWorkParty) => void;
  search: (text: string) => Promise<JobWorkParty[]>;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<JobWorkParty[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setQ('');
    setRows([]);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const mySeq = ++seq.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await search(q.trim());
        if (mySeq === seq.current) setRows(Array.isArray(data) ? data : []);
      } catch {
        if (mySeq === seq.current) setRows([]);
      } finally {
        if (mySeq === seq.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, visible, search]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.partySheet} onPress={() => {}}>
          <View style={s.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>Select Dyeing Mill</Text>
              <Text style={s.sheetSub}>Select the dyeing mill for this shade</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder="Search mill name or code"
            placeholderTextColor="#A49D94"
            style={s.input}
          />

          {value ? (
            <View style={s.currentParty}>
              <Text style={s.currentPartyText}>Current: {value.name}</Text>
              <Text style={s.codeText}>{value.acc_code}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={s.loader}><ActivityIndicator color={P.copper} /></View>
          ) : (
            <FlatList
              data={rows}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.acc_code}
              style={{ maxHeight: 380 }}
              ListEmptyComponent={<Text style={s.empty}>No dyeing mill found.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.partyRow}
                  onPress={() => { onPick(item); onClose(); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.partyName}>{item.name}</Text>
                    {item.short_name ? <Text style={s.partySub}>{item.short_name}</Text> : null}
                  </View>
                  <Text style={s.partyCode}>{item.acc_code}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SearchPicker<T>({
  visible, title, subtitle, placeholder, valueLabel, search, keyOf, primary, secondary, onClose, onPick,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  placeholder: string;
  valueLabel?: string | null;
  search: (text: string) => Promise<T[]>;
  keyOf: (item: T) => string;
  primary: (item: T) => string;
  secondary: (item: T) => string | null;
  onClose: () => void;
  onPick: (item: T) => void;
}) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setQ('');
    setItems([]);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const mySeq = ++seq.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await search(q.trim());
        if (mySeq === seq.current) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (mySeq === seq.current) setItems([]);
      } finally {
        if (mySeq === seq.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, visible, search]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.partySheet} onPress={() => {}}>
          <View style={s.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>{title}</Text>
              <Text style={s.sheetSub}>{subtitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}><Text style={s.closeText}>×</Text></TouchableOpacity>
          </View>
          <TextInput autoFocus value={q} onChangeText={setQ} placeholder={placeholder} placeholderTextColor="#A49D94" style={s.input} />
          {valueLabel ? <View style={s.currentParty}><Text style={s.currentPartyText}>Current: {valueLabel}</Text></View> : null}
          {loading ? <View style={s.loader}><ActivityIndicator color={P.copper} /></View> : (
            <FlatList
              data={items}
              keyboardShouldPersistTaps="handled"
              keyExtractor={keyOf}
              style={{ maxHeight: 380 }}
              ListEmptyComponent={<Text style={s.empty}>No matching record found.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.partyRow} onPress={() => { onPick(item); onClose(); }} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.partyName}>{primary(item)}</Text>
                    {secondary(item) ? <Text style={s.partySub}>{secondary(item)}</Text> : null}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function DyeingMasterTab({ api }: { api: DyeingMasterApi }) {
  const [colours, setColours] = useState<DyeingColour[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#3A568A');
  const [mainShade, setMainShade] = useState<MainErpShade | null>(null);
  const [design, setDesign] = useState<DyeingDesign | null>(null);
  const [designShadeName, setDesignShadeName] = useState('');
  const [mainShadePicker, setMainShadePicker] = useState(false);
  const [designPicker, setDesignPicker] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([
    { key: rowKey(), party: null, partyShadeNo: '' },
  ]);
  const [partyRowKey, setPartyRowKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listColours();
      setColours(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert('Dyeing', 'Unable to load yarn shades.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { refresh(); }, [refresh]);

  const selectedRow = useMemo(
    () => rows.find(r => r.key === partyRowKey) || null,
    [rows, partyRowKey]
  );

  const validRows = useMemo(
    () => rows.filter(r => r.party && r.partyShadeNo.trim()),
    [rows]
  );

  const reset = () => {
    setName('');
    setHex('#3A568A');
    setMainShade(null);
    setDesign(null);
    setDesignShadeName('');
    setMainShadePicker(false);
    setDesignPicker(false);
    setRows([{ key: rowKey(), party: null, partyShadeNo: '' }]);
    setCreating(false);
    setPartyRowKey(null);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Dyeing', 'Enter Shade Name.');
      return;
    }
    if (!mainShade) {
      Alert.alert('Dyeing', 'Select the Main Shade.');
      return;
    }
    if (!design) {
      Alert.alert('Dyeing', 'Select a Design.');
      return;
    }
    if (!validRows.length) {
      Alert.alert('Dyeing', 'Select a Dyeing Mill and enter its shade number.');
      return;
    }
    if (validRows.some(r => !r.party)) return;

    setSaving(true);
    try {
      await api.saveColour({
        name: name.trim(),
        hex: normalizeHex(hex),
        erp_shade_code: mainShade.shd_code,
        main_design_id: design.id,
        design_shade_name: designShadeName.trim() || name.trim(),
        mappings: validRows.map(r => ({
          party_acc_code: r.party!.acc_code,
          party_name: r.party!.name,
          party_shade_no: r.partyShadeNo.trim(),
        })),
      });
      reset();
      await refresh();
      Alert.alert('Dyeing', 'Shade saved.');
    } catch (e: any) {
      Alert.alert('Dyeing', e?.response?.data?.message || e?.message || 'Unable to save shade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Yarn Shade Master</Text>
            <Text style={s.subtitle}>
              Create and manage design-wise dyeing mill shade numbers.
            </Text>
          </View>
          <TouchableOpacity
            style={[s.addBtn, creating && s.cancelBtn]}
            onPress={() => creating ? reset() : setCreating(true)}
          >
            <Text style={[s.addBtnText, creating && { color: P.ink }]}>
              {creating ? 'Cancel' : '+ Shade'}
            </Text>
          </TouchableOpacity>
        </View>

        {creating ? (
          <View style={s.card}>
            <Text style={s.label}>Shade Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter shade name"
              placeholderTextColor="#AAA39A"
              style={s.input}
            />

            <Text style={[s.label, { marginTop: 12 }]}>Shade Colour</Text>
            <View style={s.hexRow}>
              <View style={[s.swatchLarge, { backgroundColor: normalizeHex(hex) }]} />
              <TextInput
                value={hex}
                onChangeText={setHex}
                autoCapitalize="characters"
                maxLength={7}
                placeholder="#3A568A"
                placeholderTextColor="#AAA39A"
                style={[s.input, { flex: 1 }]}
              />
            </View>

            <Text style={[s.label, { marginTop: 14 }]}>Main Shade</Text>
            <Text style={s.help}>Select the matching main shade.</Text>
            <TouchableOpacity style={s.select} onPress={() => setMainShadePicker(true)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={mainShade ? s.selectValue : s.selectPlaceholder}>
                  {mainShade ? mainShade.shd_name : 'Select Main Shade'}
                </Text>
                {mainShade ? <Text style={s.selectCode}>{mainShade.shd_code}{mainShade.short_name ? ` · ${mainShade.short_name}` : ''}</Text> : null}
              </View>
              <Text style={s.chev}>⌄</Text>
            </TouchableOpacity>

            <Text style={[s.label, { marginTop: 14 }]}>Design</Text>
            <TouchableOpacity style={s.select} onPress={() => setDesignPicker(true)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={design ? s.selectValue : s.selectPlaceholder}>
                  {design ? design.code : 'Search Design'}
                </Text>
                {design ? <Text style={s.selectCode}>{design.dsn_code ? `${design.dsn_code}` : design.id}</Text> : null}
              </View>
              <Text style={s.chev}>⌄</Text>
            </TouchableOpacity>

            <Text style={[s.label, { marginTop: 12 }]}>Reference Name</Text>
            <TextInput
              value={designShadeName}
              onChangeText={setDesignShadeName}
              placeholder={name.trim() ? `${name.trim()} for this design` : 'Optional'}
              placeholderTextColor="#AAA39A"
              style={s.input}
            />

            <Text style={[s.label, { marginTop: 14 }]}>Mill Shade Numbers</Text>
            <Text style={s.help}>
              
            </Text>

            {rows.map((r, index) => (
              <View key={r.key} style={s.mappingCard}>
                <View style={s.mappingNo}>
                  <Text style={s.mappingNoText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={s.select}
                    onPress={() => setPartyRowKey(r.key)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={r.party ? s.selectValue : s.selectPlaceholder}>
                        {r.party ? r.party.name : 'Select Dyeing Mill'}
                      </Text>
                      {r.party ? <Text style={s.selectCode}>{r.party.acc_code}</Text> : null}
                    </View>
                    <Text style={s.chev}>⌄</Text>
                  </TouchableOpacity>

                  <TextInput
                    value={r.partyShadeNo}
                    onChangeText={(v) =>
                      setRows(old => old.map(x => x.key === r.key ? { ...x, partyShadeNo: v } : x))
                    }
                    placeholder="Enter Mill Shade No."
                    placeholderTextColor="#AAA39A"
                    style={[s.input, { marginTop: 7 }]}
                  />
                </View>

                <TouchableOpacity
                  style={s.removeBtn}
                  onPress={() => setRows(old =>
                    old.length === 1
                      ? [{ ...old[0], party: null, partyShadeNo: '' }]
                      : old.filter(x => x.key !== r.key)
                  )}
                >
                  <Text style={s.removeText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={s.addPartyBtn}
              onPress={() => setRows(old => [
                ...old,
                { key: rowKey(), party: null, partyShadeNo: '' },
              ])}
            >
              <Text style={s.addPartyText}>+ Add Mill Shade</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={saving}
              style={[s.saveBtn, saving && { opacity: 0.55 }]}
              onPress={save}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.saveText}>Save Shade</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <View style={s.loader}><ActivityIndicator color={P.copper} /></View>
        ) : colours.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.empty}>No yarn shades yet.</Text>
          </View>
        ) : colours.map(c => {
          const isOpen = expanded === c.id;
          return (
            <View key={String(c.id)} style={s.colourCard}>
              <TouchableOpacity
                style={s.colourHead}
                onPress={() => setExpanded(isOpen ? null : c.id)}
              >
                <View style={[s.swatch, { backgroundColor: c.hex || '#D7D2CA' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.colourName}>{c.name}</Text>
                  <Text style={s.colourSub}>
                    {(c.maps || []).length} mill shade{(c.maps || []).length === 1 ? '' : 's'}
                  </Text>
                </View>
                {c.code ? <Text style={s.colourCode}>{c.code}</Text> : null}
                <Text style={s.chev}>{isOpen ? '⌃' : '⌄'}</Text>
              </TouchableOpacity>

              {isOpen ? (c.maps || []).map(m => (
                <View
                  key={String(m.id || `${m.party_acc_code}_${m.party_shade_no}`)}
                  style={s.savedMap}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.partyName}>{m.party_name}</Text>
                    <Text style={s.partySub}>
                      {m.party_shade_no} · {m.party_acc_code}
                    </Text>
                  </View>
                  {m.erp_shade_code != null ? (
                    <View style={s.erpBadge}>
                      <Text style={s.erpBadgeText}>{m.erp_shade_code}</Text>
                    </View>
                  ) : null}
                </View>
              )) : null}
            </View>
          );
        })}
      </ScrollView>

      <SearchPicker<MainErpShade>
        visible={mainShadePicker}
        title="Select Main Shade"
        subtitle="Choose the matching main shade"
        placeholder="Search shade name or code"
        valueLabel={mainShade ? `${mainShade.shd_name} · ${mainShade.shd_code}` : null}
        search={api.searchMainShades}
        keyOf={(x) => `${x.prp_code}_${x.shd_code}`}
        primary={(x) => x.shd_name}
        secondary={(x) => `${x.shd_code}${x.short_name ? ` · ${x.short_name}` : ''}`}
        onClose={() => setMainShadePicker(false)}
        onPick={setMainShade}
      />

      <SearchPicker<DyeingDesign>
        visible={designPicker}
        title="Select Design"
        subtitle="Choose the design for this shade"
        placeholder="Search design name or code"
        valueLabel={design ? design.code : null}
        search={api.searchDesigns}
        keyOf={(x) => x.id}
        primary={(x) => x.code}
        secondary={(x) => x.dsn_code ? `${x.dsn_code}` : null}
        onClose={() => setDesignPicker(false)}
        onPick={setDesign}
      />

      <JobWorkPartyPicker
        visible={!!partyRowKey}
        value={selectedRow?.party || null}
        search={api.searchJobWorkParties}
        onClose={() => setPartyRowKey(null)}
        onPick={(party) => {
          if (!partyRowKey) return;
          setRows(old => old.map(r => r.key === partyRowKey ? { ...r, party } : r));
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: P.bg },
  content: { padding: 14, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '800', color: P.ink },
  subtitle: { fontSize: 10.5, color: P.muted, marginTop: 2, lineHeight: 15 },
  addBtn: { backgroundColor: P.nav, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9 },
  cancelBtn: { backgroundColor: P.soft, borderWidth: 1, borderColor: P.border },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  card: { backgroundColor: P.surface, borderWidth: 1, borderColor: P.border, borderRadius: 12, padding: 13, marginBottom: 12 },
  label: { color: P.muted, fontSize: 10.5, fontWeight: '800', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .35 },
  help: { color: P.muted, fontSize: 10.5, marginTop: -1, marginBottom: 8, lineHeight: 15 },
  input: { minHeight: 44, borderWidth: 1.5, borderColor: P.border, borderRadius: 9, backgroundColor: P.surface, paddingHorizontal: 12, color: P.ink, fontSize: 13 },
  hexRow: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  swatchLarge: { width: 44, height: 44, borderRadius: 9, borderWidth: 1, borderColor: P.border },
  mappingCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 7 },
  mappingNo: { width: 24, height: 24, borderRadius: 12, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  mappingNoText: { color: P.muted, fontSize: 10, fontWeight: '800' },
  select: { minHeight: 48, borderWidth: 1.5, borderColor: P.border, borderRadius: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: P.surface },
  selectValue: { color: P.ink, fontSize: 13, fontWeight: '700' },
  selectPlaceholder: { color: '#AAA39A', fontSize: 13 },
  selectCode: { color: P.muted, fontSize: 9.5, marginTop: 2 },
  chev: { color: P.muted, fontSize: 16, marginLeft: 7 },
  removeBtn: { width: 30, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: P.danger, fontSize: 22 },
  addPartyBtn: { borderWidth: 1.5, borderColor: P.border, borderRadius: 9, padding: 11, marginTop: 4, backgroundColor: P.soft },
  addPartyText: { color: P.copper, fontSize: 12, fontWeight: '800' },
  saveBtn: { minHeight: 46, borderRadius: 9, backgroundColor: P.nav, alignItems: 'center', justifyContent: 'center', marginTop: 11 },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  loader: { padding: 28, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { backgroundColor: P.surface, borderWidth: 1, borderColor: P.border, borderRadius: 12, padding: 28 },
  empty: { color: P.muted, textAlign: 'center', fontSize: 12 },
  colourCard: { backgroundColor: P.surface, borderWidth: 1, borderColor: P.border, borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  colourHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  swatch: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, borderColor: P.border },
  colourName: { color: P.ink, fontSize: 13, fontWeight: '800' },
  colourSub: { color: P.muted, fontSize: 9.5, marginTop: 2 },
  colourCode: { color: P.muted, fontSize: 10, fontWeight: '700' },
  savedMap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 10, borderTopWidth: 1, borderTopColor: P.border },
  partyName: { color: P.ink, fontSize: 12.5, fontWeight: '700' },
  partySub: { color: P.muted, fontSize: 10.5, marginTop: 2 },
  partyCode: { color: P.copper, fontSize: 10.5, fontWeight: '800' },
  erpBadge: { backgroundColor: P.soft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  erpBadgeText: { color: P.muted, fontSize: 9.5, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(17,32,43,.38)', justifyContent: 'center', padding: 16 },
  partySheet: { backgroundColor: P.surface, borderRadius: 14, padding: 13, maxHeight: '80%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sheetTitle: { color: P.ink, fontSize: 15, fontWeight: '800' },
  sheetSub: { color: P.muted, fontSize: 10.5, marginTop: 2 },
  closeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: P.muted, fontSize: 24 },
  currentParty: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  currentPartyText: { flex: 1, color: P.muted, fontSize: 10.5 },
  codeText: { color: P.copper, fontSize: 10.5, fontWeight: '800' },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: P.border },
});