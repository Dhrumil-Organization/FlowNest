import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useHeaderExtrasStore } from '../../core/layout/headerExtras';
import { AppAccessAPI, AccessPermissionRow, AccessRole, AccessUser, unwrapAccessResponse } from '../../api/accessControl';
import { createPermissionRegistrySyncPayload, flattenPermissionRegistry, getPermissionRegistry } from '../../registry';

// ─────────────────────────────────────────────────────────────────────────
// REDESIGN NOTES (see also CHANGELOG):
//
// 1. Previously the Segment toggle, Subject selector, Assigned Roles chips,
//    Search box, Area filter chips, and Preset buttons were all rendered as
//    fixed siblings ABOVE a separate scrollable list. On a normal phone
//    screen that block alone could take 250-300px, leaving very little
//    room to actually see/scroll the permission list below it.
//
//    Fix: everything is now ONE scrollable container. The controls are the
//    first thing you see, but scrolling down moves them out of the way
//    entirely, handing the full screen height to the permission list. This
//    is the single biggest change here.
//
// 2. "Assigned Roles" used to be its own titled block (a label row, then a
//    chip row, then a hint line — 3 stacked rows). It's now a single row:
//    the "Roles" label sits inline to the left of the horizontally
//    scrolling chips, and the hint text is gone (the chip color already
//    shows on/off state, and the cycle behavior is explained once via the
//    subject card instead of repeated here every time).
//
// 3. The Area filter chips and the Full/View/None preset buttons used to
//    be two separate rows. They're now one horizontal scroll with a
//    visual divider between the two groups — same functionality, one row
//    instead of two.
// ─────────────────────────────────────────────────────────────────────────

type Mode = 'role' | 'user';
type Decision = 'allow' | 'deny' | 'inherit';
type Entry = {
  path: string;
  name: string;
  type: string;
  depth: number;
  actions: { key: string; name: string }[];
  areaName: string;
};

const keyOf = (p: string, a = '') => `${p}::${a}`;
const displayUser = (u: AccessUser) =>
  [u.first_name, u.last_name].filter(Boolean).join(' ') || u.name || u.email || `User #${u.id}`;

export function PermissionManagerScreen() {
  const registry = useMemo(() => getPermissionRegistry(), []);
  const entries: Entry[] = useMemo(
    () =>
      flattenPermissionRegistry().map((x) => ({
        path: x.resourcePath,
        name: x.resource.name,
        type: x.resource.type,
        depth: x.depth,
        actions: (x.resource.actions || []).filter((a) => a.key !== 'view').map((a) => ({ key: a.key, name: a.name })),
        areaName: x.areaName,
      })),
    [],
  );

  const [mode, setMode] = useState<Mode>('role');
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userRoleIds, setUserRoleIds] = useState<number[]>([]);
  const [values, setValues] = useState<Record<string, Decision>>({});
  const [baseline, setBaseline] = useState<Record<string, Decision>>({});
  const [inherited, setInherited] = useState<Record<string, Decision>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('all');
  const [picker, setPicker] = useState<'role' | 'user' | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);

  const loadRole = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const d = unwrapAccessResponse<any>(await AppAccessAPI.getRole(id));
      const n: Record<string, Decision> = {};
      for (const p of d.permissions || []) n[keyOf(p.resource_path, p.action_key || '')] = p.decision === 'allow' ? 'allow' : 'deny';
      setInherited({});
      setValues(n);
      setBaseline(n);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUser = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const d = unwrapAccessResponse<any>(await AppAccessAPI.getUser(id));
      setUserRoleIds((d.role_ids || []).map(Number));
      const inheritedMap: Record<string, Decision> = {};
      for (const p of d.inherited_permissions || []) inheritedMap[keyOf(p.resource_path, p.action_key || '')] = p.decision === 'allow' ? 'allow' : 'deny';
      const n: Record<string, Decision> = {};
      for (const p of d.overrides || []) n[keyOf(p.resource_path, p.action_key || '')] = p.decision === 'allow' ? 'allow' : 'deny';
      setInherited(inheritedMap);
      setValues(n);
      setBaseline(n);
    } finally {
      setLoading(false);
    }
  }, []);

  const boot = useCallback(async () => {
    setLoading(true);
    try {
      setSyncing(true);
      await AppAccessAPI.syncRegistry({ ...createPermissionRegistrySyncPayload('sudamo-mobile-registry-v1'), full_snapshot: true });
      const d = unwrapAccessResponse<any>(await AppAccessAPI.bootstrap());
      const rr = d.roles || [], uu = d.users || [];
      setRoles(rr);
      setUsers(uu);
      const rid = Number(rr[0]?.id || 0), uid = Number(uu[0]?.id || 0);
      setRoleId(rid || null);
      setUserId(uid || null);
      if (rid) await loadRole(rid);
    } catch (e: any) {
      Alert.alert('Access setup', e?.message || 'Unable to load access control.');
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [loadRole]);

  useEffect(() => { void boot(); }, [boot]);

  // The header itself (title/eyebrow/sign-out) is rendered once by
  // app/new/(tabs)/_layout.tsx. Only the "Sync Registry" button needs to
  // reach it, via the shared extras store — see headerExtras.ts.
  const setHeaderExtras = useHeaderExtrasStore((s) => s.setHeaderExtras);
  const clearHeaderExtras = useHeaderExtrasStore((s) => s.clearHeaderExtras);
  useFocusEffect(
    useCallback(() => {
      setHeaderExtras({
        right: (
          <TouchableOpacity style={s.sync} disabled={syncing} onPress={boot}>
            <Text style={s.syncText}>{syncing ? 'Syncing…' : 'Sync Registry'}</Text>
          </TouchableOpacity>
        ),
      });
      return () => clearHeaderExtras();
    }, [syncing, boot, setHeaderExtras, clearHeaderExtras]),
  );

  const changeMode = async (m: Mode) => {
    if (dirty) { Alert.alert('Unsaved changes', 'Save or discard changes before switching.'); return; }
    setMode(m);
    if (m === 'role' && roleId) await loadRole(roleId);
    if (m === 'user' && userId) await loadUser(userId);
  };

  const chooseRole = async (id: number) => { setPicker(null); setRoleId(id); await loadRole(id); };
  const chooseUser = async (id: number) => { setPicker(null); setUserId(id); await loadUser(id); };

  const cycle = (path: string, action = '') => {
    const k = keyOf(path, action);
    setValues((v) => {
      const cur = v[k] ?? (mode === 'user' ? 'inherit' : 'deny');
      const next: Decision = mode === 'user'
        ? (cur === 'inherit' ? 'allow' : cur === 'allow' ? 'deny' : 'inherit')
        : (cur === 'allow' ? 'deny' : 'allow');
      const n = { ...v };
      if (mode === 'user' && next === 'inherit') delete n[k];
      else n[k] = next;
      return n;
    });
  };

  const preset = (kind: 'full' | 'view' | 'none') => {
    const n = { ...values };
    for (const e of entries) {
      n[keyOf(e.path)] = kind === 'none' ? 'deny' : 'allow';
      for (const a of e.actions) {
        n[keyOf(e.path, a.key)] = kind === 'full'
          ? 'allow'
          : kind === 'view' && ['view', 'open', 'read', 'list', 'browse', 'preview'].includes(a.key)
            ? 'allow'
            : 'deny';
      }
    }
    setValues(n);
  };

  const save = async () => {
    if (mode === 'role' && !roleId) return;
    if (mode === 'user' && !userId) return;
    const rows: AccessPermissionRow[] = Object.entries(values).map(([k, d]) => {
      const i = k.lastIndexOf('::');
      return { resource_path: k.slice(0, i), action_key: k.slice(i + 2), decision: d };
    });
    try {
      setSaving(true);
      if (mode === 'role') { await AppAccessAPI.saveRole(roleId!, rows); await loadRole(roleId!); }
      else { await AppAccessAPI.saveUser(userId!, userRoleIds, rows); await loadUser(userId!); }
      Alert.alert('Saved', 'Permissions were saved and reloaded from the database.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = entries.filter(
    (e) => (area === 'all' || e.areaName === area) &&
      `${e.name} ${e.path} ${e.type} ${e.areaName}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selectedName = mode === 'role'
    ? (roles.find((r) => r.id === roleId)?.role_name || 'Select role')
    : (users.find((u) => u.id === userId) ? displayUser(users.find((u) => u.id === userId)!) : 'Select user');

  return (
    <View style={s.safe}>
      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator />
          <Text>Loading permissions…</Text>
        </View>
      ) : (
        // FIX: controls + list are now ONE scroll container (previously the
        // controls were fixed siblings above a separate scrollable list,
        // which is what left so little room to actually browse the list).
        <ScrollView style={s.list} contentContainerStyle={{ paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
          <View style={s.segment}>
            <TouchableOpacity onPress={() => changeMode('role')} style={[s.seg, mode === 'role' && s.segOn]}>
              <Text style={[s.segText, mode === 'role' && s.segTextOn]}>Role</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeMode('user')} style={[s.seg, mode === 'user' && s.segOn]}>
              <Text style={[s.segText, mode === 'user' && s.segTextOn]}>User Override</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.subject} onPress={() => setPicker(mode)}>
            <Text style={s.subjectLabel}>{mode === 'role' ? 'EDITING ROLE' : 'EDITING USER'}</Text>
            <Text style={s.subjectName}>{selectedName}  ›</Text>
          </TouchableOpacity>

          {mode === 'user' && (
            <View style={s.rolesRow}>
              <Text style={s.rolesLabel}>ROLES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                {roles.map((r) => {
                  const on = userRoleIds.includes(r.id);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => setUserRoleIds((x) => (on ? x.filter((i) => i !== r.id) : [...x, r.id]))}
                      style={[s.roleChip, on && s.roleChipOn]}
                    >
                      <Text style={[s.roleChipText, on && s.roleChipTextOn]}>{r.role_name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={s.tools}>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search screen or action" style={s.search} />

            {/* Area filter + presets combined into one horizontal row
                (previously two separate rows) with a divider between the
                two groups. */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
              <TouchableOpacity style={[s.area, area === 'all' && s.areaOn]} onPress={() => setArea('all')}>
                <Text style={[s.areaText, area === 'all' && s.areaTextOn]}>All</Text>
              </TouchableOpacity>
              {registry.map((a) => (
                <TouchableOpacity key={a.key} style={[s.area, area === a.name && s.areaOn]} onPress={() => setArea(a.name)}>
                  <Text style={[s.areaText, area === a.name && s.areaTextOn]}>{a.name}</Text>
                </TouchableOpacity>
              ))}
              <View style={s.filterDivider} />
              <TouchableOpacity style={s.preset} onPress={() => preset('full')}><Text style={s.presetText}>Full</Text></TouchableOpacity>
              <TouchableOpacity style={s.preset} onPress={() => preset('view')}><Text style={s.presetText}>View only</Text></TouchableOpacity>
              <TouchableOpacity style={s.preset} onPress={() => preset('none')}><Text style={s.presetText}>None</Text></TouchableOpacity>
            </ScrollView>
          </View>

          {filtered.map((e) => (
            <View key={e.path} style={[s.node, { marginLeft: e.depth * 12 }]}>
              <View style={s.nodeHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.nodeName}>{e.name}</Text>
                  <Text style={s.nodePath}>{e.areaName} · {e.path}</Text>
                </View>
                <View style={s.decisionWrap}>
                  <Decision value={values[keyOf(e.path)] ?? (mode === 'user' ? 'inherit' : 'deny')} onPress={() => cycle(e.path)} />
                  {mode === 'user' && <Text style={s.inheritedText}>Role: {(inherited[keyOf(e.path)] || 'deny').toUpperCase()}</Text>}
                </View>
              </View>
              {e.actions.map((a) => (
                <View key={a.key} style={s.action}>
                  <Text style={s.actionName}>{a.name}</Text>
                  <View style={s.decisionWrap}>
                    <Decision value={values[keyOf(e.path, a.key)] ?? (mode === 'user' ? 'inherit' : 'deny')} onPress={() => cycle(e.path, a.key)} />
                    {mode === 'user' && <Text style={s.inheritedText}>Role: {(inherited[keyOf(e.path, a.key)] || 'deny').toUpperCase()}</Text>}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={s.footer}>
        <TouchableOpacity disabled={!dirty || saving} style={[s.discard, !dirty && s.disabled]} onPress={() => setValues(baseline)}>
          <Text>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={!dirty || saving} style={[s.save, !dirty && s.disabled]} onPress={save}>
          <Text style={s.saveText}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => { setPicker(null); setPickerQuery(''); }}>
        <View style={s.modalShade}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{picker === 'role' ? 'Select role' : 'Select user'}</Text>
            <TextInput
              autoFocus
              value={pickerQuery}
              onChangeText={setPickerQuery}
              placeholder={picker === 'role' ? 'Search role' : 'Search user or email'}
              style={s.pickerSearch}
            />
            <ScrollView style={s.pickerList} keyboardShouldPersistTaps="handled">
              {picker === 'role'
                ? roles
                    .filter((r) => `${r.role_name} ${r.id}`.toLowerCase().includes(pickerQuery.trim().toLowerCase()))
                    .map((r) => (
                      <TouchableOpacity key={r.id} style={s.pickRow} onPress={() => { chooseRole(r.id); setPickerQuery(''); }}>
                        <Text>{r.role_name}</Text>
                      </TouchableOpacity>
                    ))
                : users
                    .filter((u) => `${displayUser(u)} ${u.email || ''} ${u.id}`.toLowerCase().includes(pickerQuery.trim().toLowerCase()))
                    .map((u) => (
                      <TouchableOpacity key={u.id} style={s.pickRow} onPress={() => { chooseUser(u.id); setPickerQuery(''); }}>
                        <Text>{displayUser(u)}</Text>
                        <Text style={s.nodePath}>{u.email || `#${u.id}`}</Text>
                      </TouchableOpacity>
                    ))}
            </ScrollView>
            <TouchableOpacity style={s.close} onPress={() => { setPicker(null); setPickerQuery(''); }}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Decision({ value, onPress }: { value: Decision; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.decision, value === 'allow' && s.allow, value === 'deny' && s.deny]}>
      <Text style={[s.decisionText, value !== 'inherit' && { color: '#fff' }]}>
        {value === 'allow' ? 'ALLOW' : value === 'deny' ? 'DENY' : 'INHERIT'}
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F3EE' },

  sync: { borderWidth: 1, borderColor: '#D5A35C', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9 },
  syncText: { color: '#D5A35C', fontWeight: '800', fontSize: 11 },

  segment: { flexDirection: 'row', margin: 12, marginBottom: 8, backgroundColor: '#E7E0D6', borderRadius: 10, padding: 3 },
  seg: { flex: 1, padding: 9, alignItems: 'center', borderRadius: 8 },
  segOn: { backgroundColor: '#fff' },
  segText: { fontWeight: '800', color: '#6B7280' },
  segTextOn: { color: '#172335' },

  subject: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0D8CE' },
  subjectLabel: { fontSize: 9, fontWeight: '900', color: '#8A8177' },
  subjectName: { fontSize: 16, fontWeight: '900', color: '#172335', marginTop: 3 },

  // Compacted from 3 stacked rows (label / chips / hint) to 1 row: an
  // inline label to the left of the horizontally scrolling chips.
  rolesRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 8, gap: 8 },
  rolesLabel: { fontSize: 9, fontWeight: '900', color: '#8A8177', width: 44 },
  roleChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E7E0D6', marginRight: 7 },
  roleChipOn: { backgroundColor: '#172335' },
  roleChipText: { fontSize: 11, fontWeight: '700', color: '#172335' },
  roleChipTextOn: { color: '#fff' },

  tools: { paddingHorizontal: 12, marginBottom: 4 },
  search: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8CE', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },

  // Area filter chips + preset buttons combined into one horizontal row
  // (previously two separate rows), separated by a small vertical divider.
  filterRow: { flexDirection: 'row', alignItems: 'center' },
  filterDivider: { width: 1, height: 20, backgroundColor: '#D8CFC3', marginHorizontal: 8 },
  area: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, backgroundColor: '#E7E0D6', marginRight: 6 },
  areaOn: { backgroundColor: '#D5A35C' },
  areaText: { fontSize: 12, color: '#172335' },
  areaTextOn: { color: '#fff', fontWeight: '700' },
  preset: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8CE', marginRight: 7 },
  presetText: { fontSize: 12, color: '#172335' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  list: { flex: 1, paddingHorizontal: 12 },

  node: { backgroundColor: '#fff', borderRadius: 11, borderWidth: 1, borderColor: '#E0D8CE', marginBottom: 8, overflow: 'hidden' },
  nodeHead: { padding: 12, flexDirection: 'row', alignItems: 'center' },
  nodeName: { fontSize: 14, fontWeight: '900', color: '#172335' },
  nodePath: { fontSize: 9, color: '#8A8177', marginTop: 3 },
  action: { borderTopWidth: 1, borderTopColor: '#EEE8DF', paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center' },
  actionName: { flex: 1, fontSize: 12, fontWeight: '700' },
  decision: { minWidth: 68, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 7, backgroundColor: '#E7E0D6', alignItems: 'center' },
  allow: { backgroundColor: '#137A63' },
  deny: { backgroundColor: '#B94A48' },
  decisionText: { fontSize: 9, fontWeight: '900', color: '#6B7280' },
  decisionWrap: { alignItems: 'flex-end' },
  inheritedText: { fontSize: 9, color: '#7D8794', marginTop: 3 },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E0D8CE', flexDirection: 'row', gap: 10 },
  discard: { flex: 1, padding: 13, borderRadius: 10, backgroundColor: '#E7E0D6', alignItems: 'center' },
  save: { flex: 2, padding: 13, borderRadius: 10, backgroundColor: '#172335', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.45 },

  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', height: '75%', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 },
  pickerList: { flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 10 },
  pickerSearch: { backgroundColor: '#F6F3EE', borderWidth: 1, borderColor: '#E0D8CE', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  pickRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EEE8DF' },
  close: { marginTop: 12, padding: 12, alignItems: 'center', backgroundColor: '#E7E0D6', borderRadius: 9 },
});

export default PermissionManagerScreen;
