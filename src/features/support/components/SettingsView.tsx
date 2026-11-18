// FILE: src/features/support/components/SettingsView.tsx
// SETTINGS (IT admin) — every limit and rule of the Support Desk, saved in the database:
// upload size (default 1 GB), files per message, blocked file types, Done rules, what FlowNest
// users may see / do, chat permissions, edit window, live refresh speed. Changes reach every
// open app at once (live event) — no backend change, no restart.
import { T } from '@/src/theme';
import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { SupportCall } from '../api';
import { Btn, Empty, Input, toast, useLayout } from './ui';

type Setting = { key: string; type: 'int' | 'bool' | 'csv'; value: any; default: any; min: number | null; max: number | null; group: string; label: string; help: string };
const GROUP_ICON: Record<string, string> = { Uploads: 'cloud-upload', 'Work rules': 'rule', 'FlowNest users': 'people', Chat: 'forum', 'Live updates': 'bolt' };
const UNIT: Record<string, string> = { max_upload_mb: 'MB', zip_max_mb: 'MB', edit_minutes: 'min', poll_seconds: 's' };
const QUICK: Record<string, { label: string; v: number }[]> = {
  max_upload_mb: [{ label: '100 MB', v: 100 }, { label: '500 MB', v: 500 }, { label: '1 GB', v: 1024 }, { label: '2 GB', v: 2000 }],
  poll_seconds: [{ label: '1 s', v: 1 }, { label: '2 s', v: 2 }, { label: '3 s', v: 3 }, { label: '10 s', v: 10 }],
};

export function SettingsView({ api, onSaved }: { api: SupportCall; onSaved?: (pub: Record<string, any>) => void }) {
  const { phone, wide } = useLayout();
  const [list, setList] = useState<Setting[] | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api<{ settings: Setting[] }>('settings.get').then((r) => { setList(r.settings); setDraft({}); setErr(''); }).catch((e) => setErr(e?.message || 'Could not load the settings.'));
  useEffect(() => { void load(); }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const g: Record<string, Setting[]> = {};
    (list || []).forEach((s) => { (g[s.group] = g[s.group] || []).push(s); });
    return Object.entries(g);
  }, [list]);
  const val = (s: Setting) => (s.key in draft ? draft[s.key] : s.value);
  const changed = Object.keys(draft).filter((k) => { const s = list?.find((x) => x.key === k); return s && String(draft[k]) !== String(s.value); });

  const problems = (): string[] => {
    const out: string[] = [];
    (list || []).forEach((s) => {
      if (!(s.key in draft) || s.type !== 'int') return;
      const n = Number(draft[s.key]);
      if (!Number.isFinite(n) || String(draft[s.key]).trim() === '') out.push(`${s.label}: enter a number`);
      else if (s.min !== null && n < s.min) out.push(`${s.label}: at least ${s.min}`);
      else if (s.max !== null && n > s.max) out.push(`${s.label}: at most ${s.max}`);
    });
    return out;
  };
  const save = async () => {
    const p = problems();
    if (p.length) { void AppAlert.alert('Check these settings', p.join('\n')); return; }
    const values: Record<string, any> = {};
    changed.forEach((k) => { const s = list!.find((x) => x.key === k)!; values[k] = s.type === 'int' ? Number(draft[k]) : draft[k]; });
    setBusy(true);
    try {
      const r = await api<{ settings: Setting[]; public: Record<string, any> }>('settings.save', { values });
      setList(r.settings); setDraft({});
      onSaved?.(r.public);
      toast('Settings saved — every open app uses them now', 'ok');
    } catch (e: any) {
      void AppAlert.alert('Could not save', e?.message || 'Please try again.');
    } finally { setBusy(false); }
  };

  if (err && !list) return <Empty icon="error-outline" title="Could not load" text={err} action={<Btn small kind="ghost" title="Retry" onPress={() => void load()} />} />;
  if (!list) return <ActivityIndicator color={T.copper} style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 100 }}>
        <View style={x.intro}>
          <Icon name="tune" size={20} color={T.copper} />
          <Text style={x.introText}>Limits and rules for the whole Support Desk. Saved in the database — no backend change or restart. Open apps pick them up at once.</Text>
        </View>
        <View style={[x.grid, wide && { flexDirection: 'row', flexWrap: 'wrap' }]}>
          {groups.map(([g, items]) => (
            <View key={g} style={[x.card, wide && { width: '49.3%' as any }]}>
              <View style={x.cardHead}><Icon name={(GROUP_ICON[g] || 'settings') as any} size={17} color={T.nav} /><Text style={x.cardTitle}>{g}</Text></View>
              {items.map((s) => {
                const v = val(s);
                const dirty = s.key in draft && String(draft[s.key]) !== String(s.value);
                return (
                  <View key={s.key} style={[x.row, phone && { flexDirection: 'column', alignItems: 'stretch' }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={x.label}>{s.label}{dirty ? <Text style={{ color: T.copper }}>  • changed</Text> : null}</Text>
                      {s.help ? <Text style={x.help}>{s.help}</Text> : null}
                      {QUICK[s.key] ? (
                        <View style={x.quick}>
                          {QUICK[s.key].map((q) => (
                            <Text key={q.v} onPress={() => setDraft((d) => ({ ...d, [s.key]: q.v }))} style={[x.chip, Number(v) === q.v && x.chipOn]} accessibilityRole="button">{q.label}</Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                    {s.type === 'bool' ? (
                      <Switch value={!!v} onValueChange={(b) => setDraft((d) => ({ ...d, [s.key]: b }))} trackColor={{ true: T.copper, false: T.border }} thumbColor="#fff" accessibilityLabel={s.label} />
                    ) : s.type === 'int' ? (
                      <View style={{ width: phone ? '100%' as any : 130, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ flex: 1 }}><Input value={String(v)} onChangeText={(t) => setDraft((d) => ({ ...d, [s.key]: t.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" compact accessibilityLabel={s.label} /></View>
                        {UNIT[s.key] ? <Text style={x.unit}>{UNIT[s.key]}</Text> : null}
                      </View>
                    ) : (
                      <View style={{ width: phone ? '100%' as any : 240 }}>
                        <Input value={String(v)} onChangeText={(t) => setDraft((d) => ({ ...d, [s.key]: t }))} compact autoCapitalize="none" accessibilityLabel={s.label} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        <Text style={x.note}>php.ini on the server must allow at least 8 MB per request (post_max_size / upload_max_filesize) — big files go up in 4 MB pieces, so 1–2 GB files need no other change. The Server page warns if it is too small.</Text>
      </ScrollView>
      {changed.length ? (
        <View style={x.bar}>
          <Text style={x.barText}>{changed.length} change{changed.length === 1 ? '' : 's'} not saved</Text>
          <Btn small kind="ghost" title="Undo" onPress={() => setDraft({})} />
          <Btn small title="Save settings" icon="check" busy={busy} onPress={save} />
        </View>
      ) : null}
    </View>
  );
}

const x = StyleSheet.create({
  intro: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: `${T.copper}10`, borderWidth: 1, borderColor: `${T.copper}30` },
  introText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: T.ink },
  grid: { gap: 12, justifyContent: 'space-between' },
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14, gap: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '900', color: T.nav },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.hair },
  label: { fontSize: 13, fontWeight: '800', color: T.ink },
  help: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },
  unit: { fontSize: 12, fontWeight: '800', color: T.muted },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { fontSize: 11, fontWeight: '800', color: T.nav, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: T.alt, overflow: 'hidden' },
  chipOn: { backgroundColor: T.copper, color: '#fff' },
  note: { fontSize: 11.5, fontWeight: '600', color: T.muted, paddingHorizontal: 4 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  barText: { flex: 1, fontSize: 12.5, fontWeight: '800', color: T.copper },
});
