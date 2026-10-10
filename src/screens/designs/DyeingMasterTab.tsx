import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import AppAlert from '@/common/utils/appAlert';

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
  category?: string | null;
  type?: string | null;
};

export type DyeingPartyShade = {
  id?: string | number | null;
  design_shade_id?: string | null;
  party_acc_code: string;
  party_name: string;
  party_shade_no: string;
  party_shade_name?: string | null;
  erp_shade_code?: string | number | null;
};

export type DyeingColourDesign = {
  design_shade_id: string;
  main_design_id: string;
  design_code: string;
  dsn_code?: string | null;
  shade_name?: string | null;
};

export type DyeingColourYarn = {
  mi_id: string;
  name: string;            // e.g. "55 Lea", "1/21 EXCEL/ LINEN 60"
  side: 'warp' | 'weft';
};

export type DyeingColour = {
  id: string | number;
  code?: string | null;
  name: string;
  hex?: string | null;
  erp_shade_code?: number | null;
  designs?: DyeingColourDesign[];
  maps?: DyeingPartyShade[];
  yarns?: DyeingColourYarn[];   // yarns this shade is used on (from saved colourways)
  colourways?: string[];        // colourway / sub-design codes using this shade
};

type MillMapping = {
  id?: string | null;
  party_acc_code: string;
  party_name: string;
  party_shade_no: string;
  party_shade_name?: string | null;
};

// Shade Colour, Main Shade and Reference Name are hidden in the form.
// They stay optional in the API, so the backend keeps its own defaults.
export type DyeingColourPayload = {
  name: string;
  main_design_ids: string[];
  mappings: MillMapping[];
};

export type DyeingMasterApi = {
  listColours: () => Promise<DyeingColour[]>;
  searchMainShades: (search: string) => Promise<MainErpShade[]>;
  searchDesigns: (search: string) => Promise<DyeingDesign[]>;
  searchJobWorkParties: (search: string) => Promise<JobWorkParty[]>;
  saveColour: (payload: DyeingColourPayload) => Promise<any>;
  updateColour: (id: string, payload: DyeingColourPayload) => Promise<any>;
  deleteColour: (id: string) => Promise<any>;
};

type DraftRow = {
  key: string;
  party: JobWorkParty | null;
  partyShadeNo: string;
  mapId?: string | null;            // existing row (edit)
  partyShadeName?: string | null;   // kept as-is on edit
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

// Exact message from the backend (message + validation errors). Falls back to a
// clear text for timeout / no network / route-or-method-not-found / HTML errors.
export const apiErrorText = (e: any, fallback: string): string => {
  const res = e?.response;
  const data = res?.data;
  const status: number | undefined = res?.status;

  if (data && typeof data === 'object') {
    const parts: string[] = [];
    const msg = typeof data.message === 'string' ? data.message.trim() : '';
    if (msg) parts.push(msg);
    if (data.errors && typeof data.errors === 'object') {
      Object.values(data.errors).flat().forEach((x: any) => {
        const t = String(x ?? '').trim();
        if (t && !parts.some(p => p.includes(t))) parts.push(t);
      });
    }
    if (!parts.length && typeof data.error === 'string') parts.push(data.error);
    if (parts.length) {
      const text = parts.join('\n');
      // Laravel "method/route not found" → say which API is missing on the server
      if ((status === 404 || status === 405 || status === 500) &&
          /does not exist|not supported for route|could not be found|not found/i.test(text) &&
          /method|route/i.test(text)) {
        const api = `${String(e?.config?.method || '').toUpperCase()} /api${e?.config?.url || ''}`;
        return `${text}\n\nServer par ye API abhi nahi hai: ${api}`;
      }
      return text;
    }
  }

  if (e?.code === 'ECONNABORTED' || /timeout/i.test(String(e?.message || ''))) {
    return `${fallback}\nServer ne 30 sec mein jawab nahi diya (DB busy / locked). List refresh karke check karein.`;
  }
  if (!res) return `${fallback}\nServer se connection nahi hua (network).`;
  if (status === 404) return `${fallback}\nAPI not found (404): ${String(e?.config?.method || '').toUpperCase()} /api${e?.config?.url || ''}`;
  if (status === 405) return `${fallback}\nMethod not allowed (405): ${String(e?.config?.method || '').toUpperCase()} /api${e?.config?.url || ''}`;
  return `${fallback}${status ? ` (HTTP ${status})` : ''}`;
};

const errMsg = apiErrorText;
const okMsg = (res: any, fallback: string): string => {
  const m = res?.data?.message;
  return typeof m === 'string' && m.trim() ? m.trim() : fallback;
};

// ── accurate list search ──────────────────────────────────────
// Searches shade, code, ERP code, designs, mill name / code / shade no.,
// the YARNS the shade is used on (55 Lea, 1/21 EXCEL…) and colourway codes.
// Every typed word must match the START of a word (so "55" finds "55 Lea",
// not "155 Lea"); parts after - or / count as words too ("45" finds "N-45").
// Exact match ranks first, then starts-with, then the rest.
const norm = (v: unknown) => String(v ?? '').toUpperCase().replace(/\s+/g, ' ').trim();

function colourFields(c: DyeingColour): string[] {
  const out: unknown[] = [c.name, c.code, c.erp_shade_code];
  (c.designs || []).forEach(d => out.push(d.design_code, d.dsn_code));
  (c.maps || []).forEach(m => out.push(m.party_name, m.party_acc_code, m.party_shade_no, m.party_shade_name));
  (c.yarns || []).forEach(y => out.push(y.name));
  (c.colourways || []).forEach(code => out.push(code));
  return out.map(norm).filter(Boolean);
}

function fieldWords(fields: string[]): string[] {
  const words: string[] = [];
  fields.forEach(f => f.split(' ').forEach(w => {
    if (!w) return;
    words.push(w);
    w.split(/[-/]+/).forEach(p => { if (p && p !== w) words.push(p); });
  }));
  return words;
}

function searchColours(list: DyeingColour[], query: string): DyeingColour[] {
  const q = norm(query);
  if (!q) return list;
  const tokens = q.split(' ');
  return list
    .map(c => {
      const fields = colourFields(c);
      const words = fieldWords(fields);
      if (!tokens.every(t => words.some(w => w.startsWith(t)))) return null;
      const rank = fields.some(f => f === q) ? 0 : fields.some(f => f.startsWith(q)) ? 1 : 2;
      return { c, rank };
    })
    .filter((x): x is { c: DyeingColour; rank: number } => !!x)
    .sort((a, b) => a.rank - b.rank || norm(a.c.name).localeCompare(norm(b.c.name)))
    .map(x => x.c);
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

// Multi-select design picker: tap to tick / untick, "Done" applies.
function DesignMultiPicker({
  visible, selected, search, onClose, onDone,
}: {
  visible: boolean;
  selected: DyeingDesign[];
  search: (text: string) => Promise<DyeingDesign[]>;
  onClose: () => void;
  onDone: (designs: DyeingDesign[]) => void;
}) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<DyeingDesign[]>([]);
  const [picked, setPicked] = useState<DyeingDesign[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setQ('');
    setItems([]);
    setPicked(selected);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const isPicked = (d: DyeingDesign) => picked.some(x => x.id === d.id);
  const toggle = (d: DyeingDesign) =>
    setPicked(old => old.some(x => x.id === d.id) ? old.filter(x => x.id !== d.id) : [...old, d]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.partySheet} onPress={() => {}}>
          <View style={s.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>Select Yarn-Dyed Designs</Text>
              <Text style={s.sheetSub}>Tick one or more YD designs for this shade</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}><Text style={s.closeText}>×</Text></TouchableOpacity>
          </View>
          <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Search design name or code" placeholderTextColor="#A49D94" style={s.input} />
          {picked.length ? (
            <View style={[s.chipWrap, { marginTop: 8 }]}>
              {picked.map(d => (
                <TouchableOpacity key={d.id} style={s.chip} onPress={() => toggle(d)}>
                  <Text style={s.chipText}>{d.code}</Text>
                  <Text style={s.chipX}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {loading ? <View style={s.loader}><ActivityIndicator color={P.copper} /></View> : (
            <FlatList
              data={items}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(x) => x.id}
              style={{ maxHeight: 340 }}
              ListEmptyComponent={<Text style={s.empty}>No matching design found.</Text>}
              renderItem={({ item }) => {
                const on = isPicked(item);
                return (
                  <TouchableOpacity style={s.partyRow} onPress={() => toggle(item)} activeOpacity={0.7}>
                    <View style={[s.check, on && s.checkOn]}>
                      {on ? <Text style={s.checkTick}>✓</Text> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.partyName}>{item.code}</Text>
                      <Text style={s.partySub}>
                        {[item.category, item.type || 'YD'].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
          <TouchableOpacity style={[s.saveBtn, { marginTop: 10 }]} onPress={() => { onDone(picked); onClose(); }}>
            <Text style={s.saveText}>Done{picked.length ? ` (${picked.length})` : ''}</Text>
          </TouchableOpacity>
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
  const [designs, setDesigns] = useState<DyeingDesign[]>([]);
  const [designPicker, setDesignPicker] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([
    { key: rowKey(), party: null, partyShadeNo: '' },
  ]);
  const [partyRowKey, setPartyRowKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | number | null>(null);
  const [editing, setEditing] = useState<DyeingColour | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [query, setQuery] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const visibleColours = useMemo(() => searchColours(colours, query), [colours, query]);

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
    setDesigns([]);
    setDesignPicker(false);
    setRows([{ key: rowKey(), party: null, partyShadeNo: '' }]);
    setCreating(false);
    setPartyRowKey(null);
    setEditing(null);
  };

  // Edit = same Add form, pre-filled, in edit mode.
  const startEdit = (c: DyeingColour) => {
    setEditing(c);
    setName(c.name || '');
    setDesigns((c.designs || []).map(d => ({
      id: d.main_design_id,
      code: d.design_code,
      dsn_code: d.dsn_code ?? null,
    })));
    const maps = c.maps || [];
    setRows(maps.length ? maps.map(m => ({
      key: rowKey(),
      party: { acc_code: m.party_acc_code, name: m.party_name },
      partyShadeNo: m.party_shade_no || '',
      mapId: m.id != null ? String(m.id) : null,
      partyShadeName: m.party_shade_name ?? null,
    })) : [{ key: rowKey(), party: null, partyShadeNo: '' }]);
    setCreating(true);
    setPartyRowKey(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const removeColour = (c: DyeingColour) => {
    AppAlert.alert(
      'Delete shade?',
      `${c.name}${c.code ? ` (${c.code})` : ''} will be permanently deleted` +
      `${c.erp_shade_code ? ` (ERP shade ${c.erp_shade_code} too)` : ''}. ` +
      'Shades used in a colourway cannot be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(c.id);
            try {
              const res = await api.deleteColour(String(c.id));
              if (editing && String(editing.id) === String(c.id)) reset();
              if (expanded === c.id) setExpanded(null);
              await refresh();
              AppAlert.alert('Deleted', okMsg(res, `${c.name} deleted.`));
            } catch (e: any) {
              if (e?.response?.status === 404) await refresh();   // already gone → update list
              AppAlert.alert('Delete failed', errMsg(e, 'Unable to delete shade.'));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const save = async () => {
    if (!name.trim()) {
      AppAlert.alert('Dyeing', 'Enter Shade Name.');
      return;
    }
    if (!validRows.length) {
      AppAlert.alert('Dyeing', 'Select a Dyeing Mill and enter its shade number.');
      return;
    }

    const payload: DyeingColourPayload = {
      name: name.trim(),
      main_design_ids: designs.map(d => d.id),
      mappings: validRows.map(r => ({
        id: r.mapId ?? null,
        party_acc_code: r.party!.acc_code,
        party_name: r.party!.name,
        party_shade_no: r.partyShadeNo.trim(),
        party_shade_name: r.partyShadeName ?? null,
      })),
    };

    setSaving(true);
    try {
      const res = editing
        ? await api.updateColour(String(editing.id), payload)
        : await api.saveColour(payload);
      const wasEditing = !!editing;
      reset();
      setQuery('');            // an old search must not hide the shade just saved
      await refresh();
      AppAlert.alert(wasEditing ? 'Updated' : 'Saved', okMsg(res, wasEditing ? 'Shade updated.' : 'Shade saved.'));
    } catch (e: any) {
      if (e?.code === 'ECONNABORTED') refresh();   // may have saved late on the server
      AppAlert.alert(editing ? 'Update failed' : 'Save failed',
        errMsg(e, editing ? 'Unable to update shade.' : 'Unable to save shade.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.screen}>
      <ScrollView
        ref={scrollRef}
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
            {editing ? (
              <View style={s.editBanner}>
                <Text style={s.editBannerText}>
                  Edit: {editing.name}{editing.code ? ` · ${editing.code}` : ''}
                </Text>
              </View>
            ) : null}

            <Text style={s.label}>Shade Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter shade name"
              maxLength={30}
              placeholderTextColor="#AAA39A"
              style={s.input}
            />

            <Text style={[s.label, { marginTop: 14 }]}>Designs (Optional)</Text>
            <Text style={s.help}>Select one or more designs. No design = available for every design.</Text>
            <TouchableOpacity style={s.select} onPress={() => setDesignPicker(true)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={designs.length ? s.selectValue : s.selectPlaceholder}>
                  {designs.length ? `${designs.length} design${designs.length === 1 ? '' : 's'} selected` : 'Search Designs (Optional)'}
                </Text>
              </View>
              <Text style={s.chev}>⌄</Text>
            </TouchableOpacity>
            {designs.length ? (
              <View style={[s.chipWrap, { marginTop: 8 }]}>
                {designs.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={s.chip}
                    onPress={() => setDesigns(old => old.filter(x => x.id !== d.id))}
                  >
                    <Text style={s.chipText}>{d.code}</Text>
                    <Text style={s.chipX}>×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text style={[s.label, { marginTop: 14 }]}>Mill Shade Numbers</Text>

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
                      ? [{ key: old[0].key, party: null, partyShadeNo: '' }]
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
                : <Text style={s.saveText}>{editing ? 'Update Shade' : 'Save Shade'}</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* While Add / Edit form is open, the list is hidden (avoids confusion). */}
        {!creating ? (<>
        {!loading && colours.length > 0 ? (
          <View style={s.searchWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search shade, yarn (55 Lea), design, colourway, mill or mill shade no."
              placeholderTextColor="#AAA39A"
              autoCorrect={false}
              autoCapitalize="none"
              style={[s.input, { flex: 1 }]}
            />
            {query ? (
              <TouchableOpacity style={s.clearBtn} onPress={() => setQuery('')}>
                <Text style={s.removeText}>×</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        {!loading && colours.length > 0 ? (
          <Text style={s.searchCount}>
            {query.trim() ? `${visibleColours.length} of ` : ''}{colours.length} shades
            {' · '}{new Set(colours.flatMap(c => (c.designs || []).map(d => d.main_design_id))).size} designs linked
            {' · '}{colours.reduce((n, c) => n + (c.maps || []).length, 0)} mill shades
          </Text>
        ) : null}

        {loading ? (
          <View style={s.loader}><ActivityIndicator color={P.copper} /></View>
        ) : colours.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.empty}>No yarn shades yet.</Text>
          </View>
        ) : visibleColours.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.empty}>No shade matches "{query.trim()}".</Text>
          </View>
        ) : visibleColours.map(c => {
          const isOpen = expanded === c.id;
          const dCount = (c.designs || []).length;
          const mCount = (c.maps || []).length;
          return (
            <View key={String(c.id)} style={s.colourCard}>
              <View style={s.colourHead}>
                <TouchableOpacity
                  style={s.colourHeadMain}
                  onPress={() => setExpanded(isOpen ? null : c.id)}
                  activeOpacity={0.7}
                >
                  <View style={[s.swatch, { backgroundColor: c.hex || '#D7D2CA' }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.colourName} numberOfLines={1}>{c.name}</Text>
                    <Text style={s.colourSub} numberOfLines={2}>
                      {c.code ? `${c.code} · ` : ''}
                      {mCount} mill shade{mCount === 1 ? '' : 's'}
                      {dCount ? ` · ${dCount} design${dCount === 1 ? '' : 's'}` : ' · all designs'}
                      {dCount ? <Text style={s.colourDesigns}>{'  ·  '}{(c.designs || []).map(d => d.design_code).join(', ')}</Text> : null}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => startEdit(c)} disabled={saving}>
                  <Text style={s.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionDanger]}
                  onPress={() => removeColour(c)}
                  disabled={deletingId === c.id}
                >
                  {deletingId === c.id
                    ? <ActivityIndicator size="small" color={P.danger} />
                    : <Text style={[s.actionText, { color: P.danger }]}>Delete</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.colourHeadEnd}
                  onPress={() => setExpanded(isOpen ? null : c.id)}
                  activeOpacity={0.7}
                >
                  <Text style={s.chev}>{isOpen ? '⌃' : '⌄'}</Text>
                </TouchableOpacity>
              </View>

              {isOpen ? (
                <View style={s.detailBar}>
                  <View style={{ flex: 1 }}>
                    {dCount ? (
                      <View style={s.chipWrap}>
                        {(c.designs || []).map(d => (
                          <View key={d.design_shade_id} style={s.chipStatic}>
                            <Text style={s.chipText}>{d.design_code}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={s.partySub}>All designs</Text>
                    )}
                    {(c.yarns || []).length ? (
                      <Text style={[s.partySub, { marginTop: 6 }]}>
                        Used on: {(c.yarns || []).map(y => `${y.name} (${y.side === 'warp' ? 'Warp' : 'Weft'})`).join(' · ')}
                      </Text>
                    ) : null}
                    {(c.colourways || []).length ? (
                      <Text style={s.partySub}>Colourways: {(c.colourways || []).join(', ')}</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

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
        </>) : null}
      </ScrollView>

      <DesignMultiPicker
        visible={designPicker}
        selected={designs}
        search={api.searchDesigns}
        onClose={() => setDesignPicker(false)}
        onDone={setDesigns}
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
  colourHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: 12 },
  colourHeadMain: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 10 },
  colourDesigns: { fontFamily: 'monospace', color: P.muted },
  colourHeadEnd: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 4 },
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
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  clearBtn: { width: 34, height: 44, alignItems: 'center', justifyContent: 'center' },
  searchCount: { color: P.muted, fontSize: 10.5, marginBottom: 8 },
  detailBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 9, borderTopWidth: 1, borderTopColor: P.border, backgroundColor: P.soft },
  actionBtn: { borderWidth: 1, borderColor: P.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: P.surface, minWidth: 64, alignItems: 'center' },
  actionDanger: { borderColor: '#E3C5C5' },
  actionText: { color: P.ink, fontSize: 11.5, fontWeight: '800' },
  editBanner: { backgroundColor: P.soft, borderRadius: 9, padding: 10, marginBottom: 12 },
  editBannerText: { color: P.ink, fontSize: 12, fontWeight: '800' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: P.soft, borderWidth: 1, borderColor: P.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  chipStatic: { backgroundColor: P.surface, borderWidth: 1, borderColor: P.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: P.ink, fontSize: 11, fontWeight: '700' },
  chipX: { color: P.danger, fontSize: 14, fontWeight: '700' },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: P.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: P.nav, borderColor: P.nav },
  checkTick: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
