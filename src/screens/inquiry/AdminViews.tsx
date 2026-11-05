// FILE: src/screens/inquiry/AdminViews.tsx
// TAT configuration + cost-sheet authorizers (legacy TatConfigScreen + SettingsScreen).
//   GET  /api/tat/configurations           POST /api/tat/configurations/bulk
//   GET  /api/settings/authorizers         PUT  /api/settings/authorizers { user_ids }
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useInquiry, useInquiryNav } from './InquiryContext';
import { errMsg, formatHoursLabel, TatConfiguration } from './inquiryModel';
import { Banner, Btn, Card, EmptyState, ErrorBox, Field, HIT, Loader, MONO, useWide, ViewShell } from './ui';

type EditRow = TatConfiguration & { _hrs: string; _pct: string };

export function TatConfigView() {
  const { api } = useInquiry();
  const nav = useInquiryNav();
  const { wide } = useWide();
  const [rows, setRows] = useState<EditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const data = await api.tatConfigs();
      setRows(data.map((c) => ({ ...c, _hrs: String(c.expected_hours), _pct: String(c.warning_threshold_percent) })));
    } catch (e) {
      setError(errMsg(e, 'Failed to load TAT configurations'));
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [api]);

  const upd = (id: number, patch: Partial<EditRow>) => setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const save = async () => {
    for (const r of rows) {
      const h = parseInt(r._hrs, 10);
      const p = parseInt(r._pct, 10);
      if (Number.isNaN(h) || h < 1) { AppAlert.alert('Invalid', `Enter valid hours for "${r.step_name}"`); return; }
      if (Number.isNaN(p) || p < 1 || p > 100) { AppAlert.alert('Invalid', `Warning % must be 1–100 for "${r.step_name}"`); return; }
    }
    setSaving(true);
    try {
      await api.saveTatConfigs(rows.map((r) => ({
        id: r.id, expected_hours: parseInt(r._hrs, 10), warning_threshold_percent: parseInt(r._pct, 10),
      })));
      AppAlert.alert('Saved', 'TAT configurations updated successfully', [{ text: 'OK', onPress: () => nav.back() }]);
    } catch (e) {
      AppAlert.alert('Error', errMsg(e, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ViewShell
      title="TAT Configuration"
      subtitle="Expected time for each inquiry step"
      maxWidth={960}
      footer={rows.length ? (
        <View style={s.footer}>
          <View style={[s.footerInner, wide && { maxWidth: 960 }]}>
            <Btn title="Save Configuration" icon="save" variant="accent" onPress={save} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    >
      <Banner
        tone="info"
        icon="timer"
        title="TAT Configuration"
        text={'Configure expected time for each step of the inquiry workflow. Warning % is when the inquiry starts showing as "warning" before fully breaching.'}
      />
      {loading ? <Loader /> : error ? <ErrorBox text={error} onRetry={load} /> : rows.length === 0 ? (
        <EmptyState icon="timer" title="No TAT steps configured" />
      ) : (
        <View style={[wide && s.grid]}>
          {rows.map((r) => {
            const h = parseInt(r._hrs, 10);
            return (
              <Card key={r.id} style={[wide && s.gridItem]}>
                <Text style={s.step}>{r.step_name}</Text>
                {!!r.description && <Text style={s.desc}>{r.description}</Text>}
                <View style={s.row2}>
                  <View style={{ flex: 2 }}>
                    <Field label="Expected Hours" required value={r._hrs} onChangeText={(t) => upd(r.id, { _hrs: t })} keyboardType="number-pad" placeholder="e.g., 4" style={{ marginBottom: 2 }} />
                    {!Number.isNaN(h) && h > 0 && <Text style={s.hint}>= {formatHoursLabel(h)}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Warning %" value={r._pct} onChangeText={(t) => upd(r.id, { _pct: t })} keyboardType="number-pad" placeholder="75" style={{ marginBottom: 2 }} />
                    <Text style={s.hint}>of expected</Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */

export function SettingsView() {
  const { api } = useInquiry();
  const nav = useInquiryNav();
  const [ids, setIds] = useState<number[]>([]);
  const [newId, setNewId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.authorizers()
      .then((d) => { if (alive) setIds(d); })
      .catch((e) => { if (alive) setError(errMsg(e, 'Unable to load authorizers')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [api]);

  const add = () => {
    const id = parseInt(newId, 10);
    if (!id || Number.isNaN(id)) { AppAlert.alert('Invalid', 'Enter a valid user ID'); return; }
    if (ids.includes(id)) { AppAlert.alert('Already added', 'This user is already an authorizer'); return; }
    setIds([...ids, id]);
    setNewId('');
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.saveAuthorizers(ids);
      AppAlert.alert('Saved', 'Authorizer list updated', [{ text: 'OK', onPress: () => nav.back() }]);
    } catch (e) {
      AppAlert.alert('Error', errMsg(e, 'Failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ViewShell title="Cost Sheet Authorizers" subtitle="Who can approve or reject cost sheets" maxWidth={720}>
      <Banner
        tone="info"
        icon="manage-accounts"
        title="Cost Sheet Authorizers"
        text="Add user IDs of people who can approve or reject new cost sheets. They will see the authorization queue on their dashboard."
      />
      {loading ? <Loader /> : (
        <>
          {!!error && <ErrorBox text={error} />}
          <Card title="Current authorizers">
            {ids.length === 0 ? (
              <Text style={s.desc}>No authorizers set. Add at least one user ID below.</Text>
            ) : ids.map((id) => (
              <View key={id} style={s.idRow}>
                <Icon name="person" size={16} color={T.muted} />
                <Text style={s.idText}>User #{id}</Text>
                <TouchableOpacity onPress={() => setIds(ids.filter((x) => x !== id))} hitSlop={HIT} style={s.idDel}>
                  <Icon name="delete-outline" size={15} color={T.red} />
                  <Text style={s.idDelText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </Card>
          <Card title="Add authorizer">
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Field value={newId} onChangeText={setNewId} keyboardType="number-pad" placeholder="Enter user ID" style={{ flex: 1, marginBottom: 0 }} onSubmitEditing={add} />
              <Btn title="Add" icon="add" onPress={add} />
            </View>
            <Text style={[s.hint, { marginTop: 6 }]}>Tip: User IDs can be found in your user management system.</Text>
          </Card>
          <Btn title="Save Changes" icon="save" variant="accent" onPress={save} loading={saving} />
        </>
      )}
    </ViewShell>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { flexBasis: '48%', flexGrow: 1 },
  step: { fontSize: 14, fontWeight: '900', color: T.ink },
  desc: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 3, lineHeight: 17 },
  row2: { flexDirection: 'row', gap: 10, marginTop: 10 },
  hint: { fontSize: 10.5, fontWeight: '700', color: T.muted, fontFamily: MONO },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: T.hair },
  idText: { flex: 1, fontSize: 13.5, fontWeight: '800', color: T.ink, fontFamily: MONO },
  idDel: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  idDelText: { fontSize: 12, fontWeight: '800', color: T.red },
  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  footerInner: { flexDirection: 'row', padding: 10, width: '100%', alignSelf: 'center' },
});
