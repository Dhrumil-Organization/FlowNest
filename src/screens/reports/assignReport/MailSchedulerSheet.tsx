// FILE: src/screens/reports/assignReport/MailSchedulerSheet.tsx
// The web ERP's Mail Scheduler (components/MailScheduler/…/MailSchedulerPopUp.js) on FlowNest — same backend:
//   GET  /api/get_user_saved_report_settings   reports + settings (+ email / isemailvalid / emailpwd of the profile)
//   GET  /api/rptmailscheduleshow              the empty record = the keys the add / edit payload must carry
//   GET  /api/rptmailschedulebrowse            every schedule of the login
//   POST /api/rptmailscheduleadd | rptmailscheduleedit | rptmailscheduledelete
//
// Rules (= web):
//   report + setting -> subject defaults to the setting name ("_" -> " ")
//   a setting that already has a schedule -> the form loads it -> Update (report / setting locked)
//   a setting whose saved value has a schedtype -> schedule type locked to it
//   schedule type: none / daily (+ interval -999…999) / weekly (week days) / monthly (months + days 1-31)
//   status Enable (A) / Disable (P) · time (15-minute list) · mail to · subject · cc · bcc
//   validation messages as on the web
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { MailSchedule, MailScheduleAPI, SavedReport, SettingsAnswer } from './assignReportApi';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const TIMES: string[] = [];
for (let h = 0; h < 24; h++) for (const m of ['00', '15', '30', '45']) TIMES.push(`${String(h).padStart(2, '0')}:${m}`);
const SCHED: [string, string][] = [['none', 'None'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Form = {
  rptid: string; rptname: string; settingsname: string; schedtype: string; status: string; scheddt: string;
  mailto: string; subject: string; mailcc: string; mailbcc: string; interval: string;
  months: string[]; weeks: string[]; days: string[];
};
const EMPTY: Form = { rptid: '', rptname: '', settingsname: '', schedtype: 'daily', status: 'A', scheddt: '', mailto: '', subject: '', mailcc: '', mailbcc: '', interval: '0', months: [], weeks: [], days: [] };

const say = (title: string, text: string) => {
  if (Platform.OS === 'web') { const g: any = globalThis; g.alert(text ? `${title}\n\n${text}` : title); return; }
  Alert.alert(title, text);
};
const confirm = (title: string, text: string): Promise<boolean> =>
  new Promise((resolve) => {
    if (Platform.OS === 'web') { const g: any = globalThis; resolve(!!g.confirm(`${title}\n\n${text}`)); return; }
    Alert.alert(title, text, [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }]);
  });

export function MailSchedulerSheet({ visible, onClose, settings, reloadSettings }: {
  visible: boolean; onClose: () => void; settings: SettingsAnswer | null; reloadSettings: () => Promise<void>;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState<Record<string, any>>({});
  const [list, setList] = useState<MailSchedule[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [action, setAction] = useState<'add' | 'edit'>('add');
  const [schedLocked, setSchedLocked] = useState(false);
  const [picker, setPicker] = useState<'report' | 'setting' | 'time' | null>(null);
  const [listOpen, setListOpen] = useState(true);

  const reports: SavedReport[] = settings?.reports || [];
  const report = reports.find((r) => String(r.rptid) === form.rptid) || null;
  const settingsOf = report?.settings || [];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [t, l] = await Promise.all([MailScheduleAPI.template(), MailScheduleAPI.list()]);
      setTemplate(t);
      setList(l);
    } catch (e: any) {
      setError(e?.message || 'Could not load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setForm(EMPTY); setAction('add'); setSchedLocked(false);
    void load();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // the web shows these as a warning popup; here they stay visible at the top of the sheet
  const mailWarning = !settings ? '' : !settings.isEmailValid
    ? (settings.email ? `Email address is not valid [ ${settings.email} ]. Kindly set in profile.` : 'Email address is blank. Kindly set in profile')
    : !settings.emailPwdSet ? 'Email password is not set. Kindly set email password in profile.' : '';

  const clear = () => { setForm(EMPTY); setAction('add'); setSchedLocked(false); };

  const fromRow = (d: MailSchedule): Form => ({
    rptid: String(d.rptid), rptname: String(d.rptname || ''), settingsname: String(d.settingsname || ''),
    schedtype: String(d.schedtype || 'daily'), status: String(d.status || 'A'), scheddt: String(d.scheddt || ''),
    mailto: String(d.mailto || ''), subject: String(d.subject || ''), mailcc: String(d.mailcc || ''), mailbcc: String(d.mailbcc || ''),
    interval: String(d.interval ?? 0),
    months: String(d.schedmonths || '').split(',').map((x) => x.trim()).filter(Boolean),
    weeks: String(d.schedweeks || '').split(',').map((x) => x.trim()).filter(Boolean),
    days: String(d.scheddays || '').split(',').map((x) => x.trim()).filter(Boolean),
  });

  const pickReport = (id: string) => {
    const r = reports.find((x) => String(x.rptid) === id);
    setForm({ ...EMPTY, rptid: id, rptname: r ? r.rptname : '' });
    setAction('add'); setSchedLocked(false); setPicker(null);
  };
  const pickSetting = (name: string) => {
    setPicker(null);
    const existing = list.find((x) => String(x.rptid) === form.rptid && String(x.settingsname) === name);
    if (existing) { setForm(fromRow(existing)); setAction('edit'); setSchedLocked(true); return; }
    const saved = settingsOf.find((s) => s.name === name)?.value || {};
    const st = String(saved.schedtype || '');
    setForm({ ...EMPTY, rptid: form.rptid, rptname: form.rptname, settingsname: name, subject: name.replace(/_/g, ' '), schedtype: st || 'daily' });
    setAction('add');
    setSchedLocked(st !== '');
  };
  const edit = (d: MailSchedule) => { setForm(fromRow(d)); setAction('edit'); setSchedLocked(true); setListOpen(false); };
  const remove = async (d: MailSchedule) => {
    if (!(await confirm('Delete Report Setting Confirm :', `${d.rptname} : ${d.settingsname}`))) return;
    setSaving(true);
    try {
      const msg = await MailScheduleAPI.remove(d.rptid, d.settingsname);
      say('Deleted', msg);
      clear();
      await load();
    } catch (e: any) {
      say('Not deleted', e?.message || '');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (k: 'months' | 'weeks' | 'days', v: string) =>
    setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));
  const setSched = (t: string) => setForm((f) => ({ ...f, schedtype: t, months: t === 'monthly' ? f.months : [], days: t === 'monthly' ? f.days : [], weeks: t === 'weekly' ? f.weeks : [] }));

  const validate = (): string => {
    const f = form;
    const tv = f.scheddt ? parseInt(f.scheddt.replace(':', ''), 10) : NaN;
    if (!f.rptid) return 'select report';
    if (!f.settingsname) return 'select setting';
    if (!f.scheddt || !(tv <= 2359)) return 'Add proper time';
    if (!f.mailto.trim()) return 'Add mail to';
    if (!f.subject.trim()) return 'Add subject';
    if (!f.schedtype) return 'Select Schedule type';
    if (!f.status) return 'Select Schedule status';
    if (f.schedtype === 'monthly' && (!f.months.length || !f.days.length)) return 'Schedule type is monthly : so select atleast one month and select at least on day';
    if (f.schedtype === 'weekly' && !f.weeks.length) return 'Schedule type is weekly : so select atleast one week days';
    const iv = parseInt(f.interval || '0', 10);
    if (f.schedtype === 'daily' && iv > 999) return 'Interval can not be greater than 999';
    if (f.schedtype === 'daily' && iv < -999) return 'Interval can not be less than -999';
    return '';
  };

  const save = async () => {
    const why = validate();
    if (why) { say(why, ''); return; }
    const settingjson = settingsOf.find((s) => s.name === form.settingsname)?.value || null;
    // every key of the template, filled from the form (web: for keyname in FormState.values)
    const vals: Record<string, any> = {
      rptid: form.rptid, rptname: form.rptname, settingsname: form.settingsname, schedtype: form.schedtype, status: form.status,
      scheddt: form.scheddt, mailto: form.mailto.trim(), subject: form.subject.trim(), mailcc: form.mailcc.trim(), mailbcc: form.mailbcc.trim(),
      interval: parseInt(form.interval || '0', 10) || 0, settings: settingjson,
      schedmonths: form.months.join(','), schedweeks: form.weeks.join(','), scheddays: form.days.join(','),
    };
    const keys = Object.keys(template).length ? Object.keys(template) : Object.keys(vals);
    const payload: Record<string, any> = {};
    keys.forEach((k) => { payload[k] = Object.prototype.hasOwnProperty.call(vals, k) ? vals[k] : null; });
    ['rptid', 'settingsname', 'schedtype', 'status', 'scheddt', 'mailto', 'subject', 'schedmonths', 'schedweeks', 'scheddays', 'interval', 'settings', 'rptname', 'mailcc', 'mailbcc']
      .forEach((k) => { if (!(k in payload)) payload[k] = vals[k]; });
    setSaving(true);
    try {
      const msg = await MailScheduleAPI.save(action, payload);
      say(action === 'edit' ? 'Updated' : 'Saved', msg);
      clear();
      await Promise.all([load(), reloadSettings()]);
      setListOpen(true);
    } catch (e: any) {
      say('Not saved', e?.message || '');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = st.input;
  const lockRS = action === 'edit';
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={wide}>
      <View style={[st.wrap, wide && st.wrapWide]}>
        <View style={[st.sheet, wide && st.sheetWide]}>
          <View style={st.head}>
            <View style={{ flex: 1 }}>
              <Text style={st.title}>Mail Scheduler</Text>
              <Text style={st.sub}>Send a report setting by e-mail on a schedule{settings?.email ? ` · from ${settings.email}` : ''}</Text>
            </View>
            {(loading || saving) && <ActivityIndicator color={T.copper} />}
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={st.close}>×</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
            {mailWarning ? (
              <View style={st.warn}><Text style={st.warnText}>⚠  {mailWarning}</Text></View>
            ) : null}
            {!settings ? (
              <View style={st.loadingBox}><ActivityIndicator color={T.copper} /><Text style={st.loadingText}>Loading your reports…</Text></View>
            ) : loading && !list.length ? (
              <View style={st.loadingBox}><ActivityIndicator color={T.copper} /><Text style={st.loadingText}>Loading the mail schedules…</Text></View>
            ) : null}
            {error ? (
              <View style={st.warn}><Text style={st.err}>{error}</Text><TouchableOpacity onPress={() => void load()}><Text style={st.link}>Try again</Text></TouchableOpacity></View>
            ) : null}

            {/* ------------------------------ form ------------------------------ */}
            <View style={st.card}>
              <View style={st.cardHead}>
                <Text style={st.cardTitle}>{action === 'edit' ? 'Update schedule' : 'New schedule'}</Text>
                <TouchableOpacity onPress={clear}><Text style={st.link}>Clear form data</Text></TouchableOpacity>
              </View>
              <View style={st.grid}>
                <Field label="Report" req grow>
                  <Sel label={form.rptname || '--- Select register / report ---'} dim={!form.rptid} disabled={lockRS} onPress={() => setPicker('report')} />
                </Field>
                <Field label="Setting" req grow>
                  <Sel label={form.settingsname || '--- Select setting ---'} dim={!form.settingsname} disabled={lockRS || !form.rptid} onPress={() => setPicker('setting')} />
                </Field>
                <Field label="Time" req grow>
                  <Sel label={form.scheddt || '--- Select Time ---'} dim={!form.scheddt} onPress={() => setPicker('time')} />
                </Field>
                <Field label="Mail to" req grow>
                  <TextInput value={form.mailto} onChangeText={(v) => setForm((f) => ({ ...f, mailto: v }))} placeholder="a@x.com, b@y.com" placeholderTextColor={T.muted} autoCapitalize="none" keyboardType="email-address" style={inputStyle} />
                </Field>
                <Field label="Subject" req grow>
                  <TextInput value={form.subject} onChangeText={(v) => setForm((f) => ({ ...f, subject: v }))} placeholderTextColor={T.muted} style={inputStyle} />
                </Field>
                <Field label="CC" grow>
                  <TextInput value={form.mailcc} onChangeText={(v) => setForm((f) => ({ ...f, mailcc: v }))} placeholderTextColor={T.muted} autoCapitalize="none" keyboardType="email-address" style={inputStyle} />
                </Field>
                <Field label="BCC" grow>
                  <TextInput value={form.mailbcc} onChangeText={(v) => setForm((f) => ({ ...f, mailbcc: v }))} placeholderTextColor={T.muted} autoCapitalize="none" keyboardType="email-address" style={inputStyle} />
                </Field>
              </View>
              <Field label="Schedule type" req>
                <Radio options={SCHED} value={form.schedtype} onChange={setSched}
                  disabled={(v) => (action === 'edit' && form.schedtype !== v) || (action === 'add' && schedLocked && form.schedtype !== v)} />
                {schedLocked && action === 'add' ? <Text style={st.note}>Fixed by the saved setting's schedule type.</Text> : null}
              </Field>
              <View style={st.grid}>
                <Field label="Status" req grow>
                  <Radio options={[['A', 'Enable'], ['P', 'Disable']]} value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} />
                </Field>
                {form.schedtype === 'daily' ? (
                  <Field label="Interval (days, −999 … 999)" grow>
                    <TextInput value={form.interval} onChangeText={(v) => setForm((f) => ({ ...f, interval: v.replace(/[^0-9-]/g, '') }))} keyboardType="numbers-and-punctuation" style={[st.input, { maxWidth: 160 }]} placeholderTextColor={T.muted} />
                  </Field>
                ) : null}
              </View>
              {form.schedtype === 'monthly' ? (
                <>
                  <Field label="Months" req><Checks items={MONTHS} value={form.months} onToggle={(v) => toggle('months', v)} label={cap} /></Field>
                  <Field label="Days" req><Checks items={DAYS} value={form.days} onToggle={(v) => toggle('days', v)} label={(v) => v} /></Field>
                </>
              ) : null}
              {form.schedtype === 'weekly' ? (
                <Field label="Week days" req><Checks items={WEEKS} value={form.weeks} onToggle={(v) => toggle('weeks', v)} label={cap} /></Field>
              ) : null}
              <View style={st.actions}>
                <TouchableOpacity onPress={save} disabled={saving} style={[st.btn, saving && { opacity: 0.6 }]} activeOpacity={0.8}>
                  <Text style={st.btnText}>{action === 'edit' ? 'Update' : 'Save'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={st.btnGhost}><Text style={st.btnGhostText}>Close</Text></TouchableOpacity>
              </View>
            </View>

            {/* ------------------------------ list ------------------------------ */}
            <View style={st.card}>
              <TouchableOpacity onPress={() => setListOpen((v) => !v)} style={st.cardHead}>
                <Text style={st.cardTitle}>Scheduled mails · {list.length}</Text>
                <Text style={st.link}>{listOpen ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
              {listOpen ? (list.length === 0 ? <Text style={st.note}>No schedule yet.</Text> : list.map((d, i) => (
                <View key={`${d.rptid}-${d.settingsname}-${i}`} style={st.item}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.itemTitle} numberOfLines={2}>{d.rptname} <Text style={{ color: T.muted }}>· {d.settingsname}</Text></Text>
                    <Text style={st.itemMeta} numberOfLines={3}>
                      <Text style={{ color: String(d.status) === 'A' ? T.green : T.red, fontWeight: '800' }}>{String(d.status) === 'A' ? 'Active' : 'Not active'}</Text>
                      {' · '}{cap(String(d.schedtype || ''))}{d.scheddt ? ` at ${d.scheddt}` : ''}
                      {d.schedtype === 'daily' && Number(d.interval) ? ` · interval ${d.interval}` : ''}
                      {d.schedweeks ? ` · ${String(d.schedweeks).split(',').map(cap).join(', ')}` : ''}
                      {d.schedmonths ? ` · ${String(d.schedmonths).split(',').map(cap).join(', ')}` : ''}
                      {d.scheddays ? ` · days ${d.scheddays}` : ''}
                    </Text>
                    <Text style={st.itemMeta} numberOfLines={2}>To {d.mailto}{d.mailcc ? ` · CC ${d.mailcc}` : ''}{d.mailbcc ? ` · BCC ${d.mailbcc}` : ''}</Text>
                    <Text style={st.itemMeta} numberOfLines={1}>Subject: {d.subject}</Text>
                  </View>
                  <View style={st.itemBtns}>
                    <TouchableOpacity onPress={() => edit(d)} style={st.small}><Text style={st.smallText}>Edit</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => void remove(d)} style={[st.small, { borderColor: `${T.red}66` }]}><Text style={[st.smallText, { color: T.red }]}>Delete</Text></TouchableOpacity>
                  </View>
                </View>
              ))) : null}
            </View>
          </ScrollView>
        </View>
      </View>

      <Pick visible={picker === 'report'} title="Select register / report" value={form.rptid} options={reports.map((r) => [String(r.rptid), r.rptname] as [string, string])} onClose={() => setPicker(null)} onChange={pickReport} />
      <Pick visible={picker === 'setting'} title="Select setting" value={form.settingsname} options={settingsOf.map((s) => [s.name, s.name] as [string, string])} onClose={() => setPicker(null)} onChange={pickSetting} />
      <Pick visible={picker === 'time'} title="Select time" value={form.scheddt} options={TIMES.map((t) => [t, t] as [string, string])} onClose={() => setPicker(null)} onChange={(v) => { setForm((f) => ({ ...f, scheddt: v })); setPicker(null); }} />
    </Modal>
  );
}

const Field = ({ label, children, req, grow }: { label: string; children: React.ReactNode; req?: boolean; grow?: boolean }) => (
  <View style={[st.field, grow && st.fieldGrow]}>
    <Text style={st.label}>{label}{req ? <Text style={{ color: T.red }}> *</Text> : null}</Text>
    {children}
  </View>
);
const Radio = ({ options, value, onChange, disabled }: { options: [string, string][]; value: string; onChange: (v: string) => void; disabled?: (v: string) => boolean }) => (
  <View style={st.chips}>
    {options.map(([k, l]) => {
      const on = value === k, off = disabled ? disabled(k) : false;
      return (
        <TouchableOpacity key={k} onPress={() => !off && onChange(k)} style={[st.chip, on && st.chipOn, off && { opacity: 0.45 }]} activeOpacity={0.7}>
          <Text style={[st.chipText, on && { color: '#fff' }]}>{l}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);
const Checks = ({ items, value, onToggle, label }: { items: string[]; value: string[]; onToggle: (v: string) => void; label: (v: string) => string }) => (
  <View style={st.chips}>
    {items.map((v) => {
      const on = value.includes(v);
      return (
        <TouchableOpacity key={v} onPress={() => onToggle(v)} style={[st.check, on && st.checkOn]} activeOpacity={0.7}>
          <Text style={[st.checkText, on && { color: '#fff' }]}>{label(v)}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);


function Sel({ label, dim, disabled, onPress }: { label: string; dim: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={disabled ? undefined : onPress} activeOpacity={0.75} style={[st.select, disabled && { opacity: 0.55 }]}>
      <Text style={[st.selectText, dim && { color: T.muted }]} numberOfLines={1}>{label}</Text>
      <Text style={st.selectChevron}>⌄</Text>
    </TouchableOpacity>
  );
}

function Pick({ visible, title, value, options, onClose, onChange }: { visible: boolean; title: string; value: string; options: [string, string][]; onClose: () => void; onChange: (v: string) => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={st.overlay}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={st.modal}>
          <View style={st.modalHead}><Text style={st.modalTitle}>{title}</Text><TouchableOpacity onPress={onClose}><Text style={st.close}>×</Text></TouchableOpacity></View>
          <ScrollView style={st.modalList} keyboardShouldPersistTaps="handled">
            {options.length === 0 && <Text style={[st.note, { padding: 10 }]}>Nothing to choose.</Text>}
            {options.map(([k, l]) => {
              const on = value === k;
              return (
                <TouchableOpacity key={k} onPress={() => onChange(k)} style={[st.option, on && st.optionOn]}>
                  <Text style={[st.optionText, on && st.optionTextOn]} numberOfLines={2}>{l}</Text>
                  {on && <Text style={st.optionCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg },
  wrapWide: { backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { flex: 1, backgroundColor: T.bg },
  sheetWide: { flex: 0, width: '100%', maxWidth: 900, maxHeight: '92%', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: T.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  title: { fontSize: 16, fontWeight: '900', color: T.ink },
  sub: { fontSize: 10.5, color: T.muted, marginTop: 1 },
  close: { fontSize: 24, lineHeight: 24, color: T.muted, fontWeight: '700' },
  body: { padding: 12, gap: 12, paddingBottom: 40 },
  err: { color: T.red, fontSize: 12, fontWeight: '700' },
  warn: { backgroundColor: '#FCF1DC', borderWidth: 1, borderColor: '#F0D59A', borderRadius: 10, padding: 10, gap: 4 },
  warnText: { color: '#7A5200', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingText: { fontSize: 12, color: T.muted, fontWeight: '700' },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 13, fontWeight: '900', color: T.ink },
  link: { fontSize: 11.5, color: T.copper, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { gap: 4, minWidth: 0 },
  fieldGrow: { flexGrow: 1, flexBasis: 260 },
  label: { fontSize: 9.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 12.5, color: T.ink, backgroundColor: T.surface },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
  selectText: { flex: 1, fontSize: 12, fontWeight: '700', color: T.ink },
  selectChevron: { marginLeft: 6, fontSize: 13, lineHeight: 13, color: T.copper, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: `${T.copper}55`, backgroundColor: '#F8EFE6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: T.copper, borderColor: T.copper },
  chipText: { fontSize: 11, fontWeight: '800', color: T.copper },
  check: { borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, minWidth: 40, alignItems: 'center' },
  checkOn: { backgroundColor: T.green, borderColor: T.green },
  checkText: { fontSize: 11, fontWeight: '800', color: T.ink },
  note: { fontSize: 10.5, color: T.muted, lineHeight: 15 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  btn: { backgroundColor: T.copper, borderRadius: 9, paddingVertical: 10, paddingHorizontal: 22, minWidth: 110, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
  btnGhost: { borderWidth: 1, borderColor: T.border, borderRadius: 9, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: T.surface },
  btnGhostText: { color: T.ink, fontSize: 12.5, fontWeight: '800' },
  item: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.hair },
  itemTitle: { fontSize: 12.5, fontWeight: '800', color: T.ink },
  itemMeta: { fontSize: 10.5, color: T.muted, marginTop: 2, lineHeight: 14.5 },
  itemBtns: { gap: 6, justifyContent: 'center' },
  small: { borderWidth: 1, borderColor: `${T.copper}66`, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: T.surface, alignItems: 'center' },
  smallText: { fontSize: 11, fontWeight: '800', color: T.copper },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: '100%', maxWidth: 430, maxHeight: '72%', backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.alt },
  modalTitle: { fontSize: 12, fontWeight: '900', color: T.ink },
  modalList: { paddingHorizontal: 8, paddingVertical: 8 },
  option: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 3 },
  optionOn: { backgroundColor: '#F8EFE6' },
  optionText: { flex: 1, fontSize: 11, fontWeight: '700', color: T.ink },
  optionTextOn: { color: T.copper, fontWeight: '900' },
  optionCheck: { marginLeft: 10, color: T.copper, fontSize: 14, fontWeight: '900' },
});
