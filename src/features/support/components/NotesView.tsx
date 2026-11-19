// FILE: src/features/support/components/NotesView.tsx
// NOTES — the same screen in the IT Desk and in Support (FlowNest users).
//   • my notes and MEETING notes: date-time, place, attendees, discussion points, decisions,
//     action items (who / by when / done), tags, colour, pin, archive
//   • pictures and any files in a note (pick, camera, paste a copied picture, drag & drop on web)
//   • copy as text, send to any chat / group, Excel (one note or the whole list)
//   • IT admin: everybody's notes (read, Excel, delete for good)
//   • search everything (action items too), 40 at a time while scrolling
import { T } from '@/src/theme';
import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { fileUrl, SupportCall } from '../api';
import { useChat } from '../chatStore';
import { checkFiles, copyText, fileLook, fmtBytes, fromWebFiles, openLink, PickedFile, pasteFromClipboard, pickFiles, pickPhotos, takePicture, uploadAll, UploadCfg } from '../files';
import { ago, toYmd, ymdToDate } from '../model';
import { Btn, DateInput, Dialog, Empty, Field, IconBtn, Input, Panel, Segmented, Select, toast, useLayout } from './ui';

const WEB = Platform.OS === 'web';
type Act = { text: string; who: string; due: number | null; done: boolean };
type NFile = { id: number; name: string; mime: string; size: number; width: number; height: number; image: boolean; url: string; download_url: string };
export type NoteItem = {
  id: number; kind: 'note' | 'meeting'; title: string; owner: { kind: string; id: number; name: string }; mine: boolean; meeting_at: string | null; place: string; attendees: string;
  tags: string[]; color: string; pinned: boolean; archived: boolean; file_count: number; file_bytes: number; created_at: string; updated_at: string;
  actions_open: number; actions_total: number; decisions_count: number; preview?: string; body?: string; decisions?: string; actions?: Act[]; files?: NFile[];
};
const COLORS = ['', '#2F80ED', '#27AE60', '#F2994A', '#EB5757', '#9B51E0', '#0B7285'];
const VIEWS = [
  { value: 'active', label: 'All', icon: 'sticky-note-2' }, { value: 'note', label: 'Notes', icon: 'notes' }, { value: 'meeting', label: 'Meetings', icon: 'groups' },
  { value: 'pinned', label: 'Pinned', icon: 'push-pin' }, { value: 'archived', label: 'Archived', icon: 'archive' },
] as const;
type ViewKey = typeof VIEWS[number]['value'];
const fmtMeet = (iso: string | null) => { if (!iso) return ''; const d = new Date(String(iso).replace(' ', 'T')); return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

type Props = {
  api: SupportCall; base: string; admin?: boolean; upload: UploadCfg | null;
  onExcel: (params: Record<string, string>) => Promise<void>;
  openId?: number | null; onOpened?: () => void;
};

export function NotesView({ api, base, admin, upload, onExcel, openId, onOpened }: Props) {
  const { phone, wide, width } = useLayout();
  const [view, setView] = useState<ViewKey>('active');
  const [q, setQ] = useState('');
  const [owner, setOwner] = useState<string>(''); // '' mine · 'all' · 'it:3'
  const [owners, setOwners] = useState<{ key: string; name: string; notes: number }[]>([]);
  const [items, setItems] = useState<NoteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<{ id: number | null; kind: 'note' | 'meeting' } | null>(null);
  const [exporting, setExporting] = useState(false);
  const gen = useRef(0);

  const params = useCallback((before = '') => {
    const p: Record<string, any> = { q, view: view === 'note' || view === 'meeting' ? 'active' : view, kind: view === 'note' || view === 'meeting' ? view : '', before };
    if (admin && owner === 'all') p.all = 1; else if (admin && owner) p.owner = owner;
    return p;
  }, [q, view, owner, admin]);

  const load = useCallback(async (reset: boolean) => {
    const g = ++gen.current;
    setLoading(true);
    try {
      const r = await api<{ items: NoteItem[]; total: number; next: string | null }>('notes.list', params(reset ? '' : next || ''));
      if (g !== gen.current) return;
      setItems((cur) => (reset ? r.items : [...cur, ...r.items.filter((x) => !cur.some((y) => y.id === x.id))]));
      setTotal(r.total);
      setNext(r.next);
    } catch (e: any) { if (g === gen.current) void AppAlert.alert('Could not load notes', e?.message || ''); } finally { if (g === gen.current) setLoading(false); }
  }, [api, params, next]);

  useEffect(() => { const t = setTimeout(() => void load(true), q ? 300 : 0); return () => clearTimeout(t); }, [q, view, owner]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (admin) void api<{ owners: { key: string; name: string; notes: number }[] }>('notes.owners').then((r) => setOwners(r.owners)).catch(() => {}); }, [admin, api]);
  useEffect(() => { if (openId) { setEdit({ id: openId, kind: 'note' }); onOpened?.(); } }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cols = phone ? 1 : wide && width > 1300 ? 3 : 2;
  const pinnedFirst = useMemo(() => (view === 'active' ? [...items.filter((n) => n.pinned), ...items.filter((n) => !n.pinned)] : items), [items, view]);
  const excelAll = async () => {
    if (!items.length) { void AppAlert.alert('Excel', 'There are no notes in this list.'); return; }
    setExporting(true);
    try {
      const p = params();
      await onExcel({ report: 'notes', q: p.q || '', view: p.view, kind: p.kind || '', ...(p.all ? { all: '1' } : {}), ...(p.owner ? { owner: p.owner } : {}) });
    } catch (e: any) { void AppAlert.alert('Excel failed', e?.message || 'Please try again.'); } finally { setExporting(false); }
  };

  return (
    <View style={{ flex: 1, gap: 10 }}>
      <View style={[n.bar, phone && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <Segmented value={view} onChange={(v) => setView(v as ViewKey)} scroll options={VIEWS as any} />
        <View style={{ flex: 1, minWidth: 180 }}><Input value={q} onChangeText={setQ} placeholder="Search notes, decisions, actions…" icon="search" autoCorrect={false} /></View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {admin ? (
            <View style={{ width: phone ? '100%' as any : 190 }}>
              <Select value={owner} onChange={(v) => setOwner(String(v || ''))} title="Whose notes" icon="person-search" options={[
                { value: '', label: 'My notes' }, { value: 'all', label: 'Everybody' },
                ...owners.map((o) => ({ value: o.key, label: `${o.name} (${o.notes})` })),
              ]} />
            </View>
          ) : null}
          <Btn small kind="success" title="Excel" icon="file-download" busy={exporting} onPress={excelAll} />
          <Btn small kind="ghost" title="Meeting" icon="groups" onPress={() => setEdit({ id: null, kind: 'meeting' })} />
          <Btn small title="New note" icon="note-add" onPress={() => setEdit({ id: null, kind: 'note' })} />
        </View>
      </View>
      <Text style={n.count}>{loading && !items.length ? 'Loading…' : `${total.toLocaleString()} ${total === 1 ? 'note' : 'notes'}${owner === 'all' ? ' · everybody' : owner ? ` · ${owners.find((o) => o.key === owner)?.name || ''}` : ''}`}</Text>
      <FlatList
        key={`cols-${cols}`}
        data={pinnedFirst}
        numColumns={cols}
        keyExtractor={(x) => String(x.id)}
        columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
        contentContainerStyle={{ gap: 10, paddingBottom: 80 }}
        renderItem={({ item }) => <NoteCard n={item} showOwner={!item.mine} onPress={() => setEdit({ id: item.id, kind: item.kind })} cols={cols} />}
        onEndReached={() => { if (next && !loading) void load(false); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={!loading ? (
          <Empty icon="sticky-note-2" title={q ? 'No match' : 'No notes yet'} text={q ? undefined : 'Keep meeting points, decisions and to-dos here — with pictures and files. Only you see your notes.'}
            action={!q ? <Btn small title="New note" icon="note-add" onPress={() => setEdit({ id: null, kind: 'note' })} /> : undefined} />
        ) : null}
        ListFooterComponent={loading && items.length ? <ActivityIndicator color={T.copper} /> : null}
      />
      {edit ? (
        <NoteEditor key={`${edit.id || 'new'}-${edit.kind}`} id={edit.id} kind={edit.kind} api={api} base={base} admin={!!admin} upload={upload} onExcel={onExcel}
          onClose={() => setEdit(null)}
          onSaved={(note) => { setItems((cur) => [note, ...cur.filter((x) => x.id !== note.id)]); if (!edit.id) setTotal((t) => t + 1); }}
          onDeleted={(id) => { setItems((cur) => cur.filter((x) => x.id !== id)); setTotal((t) => Math.max(0, t - 1)); }} />
      ) : null}
    </View>
  );
}

function NoteCard({ n: note, showOwner, onPress, cols }: { n: NoteItem; showOwner: boolean; onPress: () => void; cols: number }) {
  return (
    <Pressable onPress={onPress} style={({ hovered, pressed }: any) => [n.card, cols > 1 ? { flex: 1, maxWidth: `${100 / cols - 1}%` as any } : null, (hovered || pressed) && { borderColor: T.copper }]} accessibilityRole="button" accessibilityLabel={`${note.kind === 'meeting' ? 'Meeting' : 'Note'}: ${note.title}`}>
      {note.color ? <View style={[n.strip, { backgroundColor: note.color }]} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={note.kind === 'meeting' ? 'groups' : 'sticky-note-2'} size={15} color={note.kind === 'meeting' ? T.purple : T.copper} />
        <Text style={n.kindText}>{note.kind === 'meeting' ? 'MEETING' : 'NOTE'}</Text>
        {note.meeting_at ? <Text style={n.meta} numberOfLines={1}>· {fmtMeet(note.meeting_at)}</Text> : null}
        <View style={{ flex: 1 }} />
        {note.pinned ? <Icon name="push-pin" size={14} color={T.copper} /> : null}
        {note.archived ? <Icon name="archive" size={14} color={T.muted} /> : null}
      </View>
      <Text style={n.title} numberOfLines={2}>{note.title}</Text>
      {note.preview ? <Text style={n.preview} numberOfLines={3}>{note.preview}</Text> : null}
      <View style={n.chips}>
        {note.decisions_count ? <Chip icon="gavel" text={`${note.decisions_count} decision${note.decisions_count === 1 ? '' : 's'}`} /> : null}
        {note.actions_total ? <Chip icon="checklist" text={`${note.actions_total - note.actions_open}/${note.actions_total} done`} color={note.actions_open ? T.amber : T.green} /> : null}
        {note.file_count ? <Chip icon="attach-file" text={`${note.file_count}`} /> : null}
        {note.tags.slice(0, 3).map((t) => <Chip key={t} text={`#${t}`} />)}
      </View>
      <Text style={n.meta}>{showOwner ? `${note.owner.name} · ` : ''}updated {ago(note.updated_at)}</Text>
    </Pressable>
  );
}
const Chip = ({ icon, text, color }: { icon?: string; text: string; color?: string }) => (
  <View style={n.chip}>{icon ? <Icon name={icon as any} size={11} color={color || T.muted} /> : null}<Text style={[n.chipText, color ? { color } : null]}>{text}</Text></View>
);

/* ------------------------------ editor ------------------------------ */

function NoteEditor({ id, kind: kind0, api, base, admin, upload, onExcel, onClose, onSaved, onDeleted }: {
  id: number | null; kind: 'note' | 'meeting'; api: SupportCall; base: string; admin: boolean; upload: UploadCfg | null;
  onExcel: (p: Record<string, string>) => Promise<void>; onClose: () => void; onSaved: (n: NoteItem) => void; onDeleted: (id: number) => void;
}) {
  const { phone } = useLayout();
  const limits = useChat((s) => s.limits);
  const [loaded, setLoaded] = useState(!id);
  const [note, setNote] = useState<NoteItem | null>(null);
  const [kind, setKind] = useState<'note' | 'meeting'>(kind0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [date, setDate] = useState<number | null>(kind0 === 'meeting' ? toYmd(new Date()) : null);
  const [time, setTime] = useState(kind0 === 'meeting' ? `${String(new Date().getHours()).padStart(2, '0')}:00` : '');
  const [place, setPlace] = useState('');
  const [attendees, setAttendees] = useState('');
  const [decisions, setDecisions] = useState('');
  const [acts, setActs] = useState<Act[]>([]);
  const [tags, setTags] = useState('');
  const [color, setColor] = useState('');
  const [pinned, setPinned] = useState(false);
  const [files, setFiles] = useState<NFile[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const [added, setAdded] = useState<PickedFile[]>([]);
  const [busy, setBusy] = useState('');
  const [pct, setPct] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [sendTo, setSendTo] = useState(false);
  const paneRef = useRef<View>(null);
  const readOnly = !!note && !note.mine;
  const touch = <F extends (...a: any[]) => void>(f: F) => ((...a: any[]) => { setDirty(true); f(...a); }) as F;

  useEffect(() => {
    if (!id) return;
    api<{ note: NoteItem }>('notes.get', { id }).then(({ note: x }) => {
      setNote(x); setKind(x.kind); setTitle(x.title); setBody(x.body || ''); setPlace(x.place); setAttendees(x.attendees); setDecisions(x.decisions || '');
      setActs(x.actions || []); setTags(x.tags.join(', ')); setColor(x.color); setPinned(x.pinned); setFiles(x.files || []);
      if (x.meeting_at) { const d = new Date(x.meeting_at); setDate(toYmd(d)); setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`); }
      setLoaded(true);
    }).catch((e) => { void AppAlert.alert('Could not open the note', e?.message || ''); onClose(); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (l: PickedFile[]) => {
    if (!l.length) return;
    const { ok, problems } = checkFiles(l, limits, files.length - removed.length + added.length);
    if (problems.length) void AppAlert.alert(ok.length ? 'Some files were left out' : 'Cannot attach', problems.join('\n\n'));
    if (ok.length) { setAdded((cur) => [...cur, ...ok]); setDirty(true); }
  };
  // web: drop or paste pictures / files into the note
  useEffect(() => {
    if (!WEB || readOnly) return undefined;
    const node: any = paneRef.current;
    if (!node?.addEventListener) return undefined;
    const over = (e: any) => { if (e.dataTransfer?.types?.includes?.('Files')) e.preventDefault(); };
    const drop = (e: any) => { e.preventDefault(); addFiles(fromWebFiles(e.dataTransfer?.files)); };
    const paste = (e: any) => { const l = fromWebFiles(e.clipboardData?.files); if (l.length) { e.preventDefault(); addFiles(l); } };
    node.addEventListener('dragover', over); node.addEventListener('drop', drop); node.addEventListener('paste', paste);
    return () => { node.removeEventListener('dragover', over); node.removeEventListener('drop', drop); node.removeEventListener('paste', paste); };
  });

  const meetingIso = () => {
    if (kind !== 'meeting' || !date) return '';
    const d = ymdToDate(date)!;
    const [h, m] = (time || '00:00').split(':').map((x) => Number(x) || 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(Math.min(23, h)).padStart(2, '0')}:${String(Math.min(59, m)).padStart(2, '0')}`;
  };
  const save = async (closeAfter = true) => {
    if (!title.trim() && !body.trim() && !decisions.trim() && !acts.length && !added.length) { void AppAlert.alert('Empty note', 'Write a title or some text first.'); return null; }
    if (time && !/^\d{1,2}:\d{2}$/.test(time.trim())) { void AppAlert.alert('Meeting time', 'Write the time like 16:30.'); return null; }
    const badAct = acts.find((a) => !a.text.trim());
    if (badAct) { void AppAlert.alert('Action items', 'Every action item needs a text — or remove the empty one.'); return null; }
    setBusy('save');
    try {
      let tokens: string[] = [];
      if (added.length) {
        if (!upload) throw new Error('Files cannot be uploaded from here.');
        setPct(0);
        tokens = await uploadAll(upload, added, (p) => setPct(p));
        setPct(null);
      }
      const r = await api<{ note: NoteItem }>('notes.save', {
        id: note?.id || '', kind, title: title.trim(), body, meeting_at: meetingIso(), place, attendees, decisions,
        actions: acts.map((a) => ({ text: a.text.trim(), who: a.who.trim(), due: a.due ? String(a.due) : '', done: a.done })), tags, color, pinned: pinned ? 1 : 0, files: tokens, remove_files: removed,
      }, { timeout: 120000 });
      setNote(r.note); setFiles(r.note.files || []); setAdded([]); setRemoved([]); setDirty(false);
      onSaved(r.note);
      toast('Note saved', 'ok');
      if (closeAfter) onClose();
      return r.note;
    } catch (e: any) {
      setPct(null);
      void AppAlert.alert('Could not save', `${e?.message || 'Please try again.'}${added.length ? '\n\nYour text is still here — press Save again.' : ''}`);
      return null;
    } finally { setBusy(''); }
  };
  const close = () => {
    if (!dirty || readOnly) { onClose(); return; }
    void AppAlert.alert('Save changes?', 'This note has changes that are not saved.', [
      { text: 'Discard', style: 'destructive', onPress: onClose }, { text: 'Keep editing', style: 'cancel' }, { text: 'Save', onPress: () => void save(true) },
    ]);
  };
  const ensureSaved = async () => (dirty || !note ? save(false) : note);
  const copy = async () => {
    const x = await ensureSaved(); if (!x) return;
    try { const r = await api<{ text: string }>('notes.text', { id: x.id }); const ok = await copyText(r.text); toast(ok ? 'Note copied — paste it anywhere' : 'Could not copy', ok ? 'ok' : 'err'); }
    catch (e: any) { void AppAlert.alert('Could not copy', e?.message || ''); }
  };
  const excel = async () => {
    const x = await ensureSaved(); if (!x) return;
    setBusy('excel');
    try { await onExcel({ report: 'notes', ids: String(x.id) }); } catch (e: any) { void AppAlert.alert('Excel failed', e?.message || ''); } finally { setBusy(''); }
  };
  const del = async () => {
    let yes = false;
    await AppAlert.alert('Delete this note?', `${note?.file_count ? `Its ${note.file_count} file(s) are removed from the server too. ` : ''}This cannot be undone.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { yes = true; } }]);
    if (!yes || !note) return;
    setBusy('del');
    try { await api('notes.delete', { id: note.id }); onDeleted(note.id); toast('Note deleted', 'ok'); onClose(); }
    catch (e: any) { void AppAlert.alert('Could not delete', e?.message || ''); } finally { setBusy(''); }
  };
  const flag = async (what: 'archive', on: boolean) => {
    if (!note) return;
    try { const r = await api<{ note: NoteItem }>('notes.flag', { id: note.id, what, on: on ? 1 : 0 }); setNote(r.note); onSaved(r.note); toast(on ? 'Archived' : 'Back in your notes', 'ok'); }
    catch (e: any) { void AppAlert.alert('Could not change', e?.message || ''); }
  };
  const pick = async (fn: () => Promise<PickedFile[]>) => { try { addFiles(await fn()); } catch (e: any) { void AppAlert.alert('Could not pick files', e?.message || ''); } };
  const pics = files.filter((f) => f.image && !removed.includes(f.id));
  const docs = files.filter((f) => !f.image && !removed.includes(f.id));

  const footer = loaded ? (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
      {note && (note.mine || admin) ? <Btn small kind="ghost" icon="delete-outline" title={phone ? '' : 'Delete'} busy={busy === 'del'} onPress={del} /> : null}
      {note?.mine ? <Btn small kind="ghost" icon={note.archived ? 'unarchive' : 'archive'} title={phone ? '' : note.archived ? 'Unarchive' : 'Archive'} onPress={() => void flag('archive', !note.archived)} /> : null}
      <View style={{ flex: 1 }} />
      <Btn small kind="ghost" icon="content-copy" title={phone ? '' : 'Copy'} onPress={copy} />
      <Btn small kind="ghost" icon="send" title={phone ? '' : 'Send to chat'} onPress={async () => { const x = await ensureSaved(); if (x) setSendTo(true); }} />
      <Btn small kind="success" icon="file-download" title={phone ? '' : 'Excel'} busy={busy === 'excel'} onPress={excel} />
      {!readOnly ? <Btn small icon="check" title="Save" busy={busy === 'save'} onPress={() => void save(true)} /> : null}
    </View>
  ) : undefined;

  return (
    <Panel visible onClose={close} title={id ? (readOnly ? `${note?.owner.name || ''} · note` : 'Note') : kind === 'meeting' ? 'New meeting note' : 'New note'} subtitle={note ? `Updated ${ago(note.updated_at)}` : 'Only you see it'} width={720} footer={footer}>
      {!loaded ? <ActivityIndicator color={T.copper} style={{ marginTop: 30 }} /> : (
        <View style={{ flex: 1 }} ref={paneRef} collapsable={false}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {readOnly ? <View style={n.ro}><Icon name="visibility" size={15} color={T.blue} /><Text style={n.roText}>You see {note?.owner.name}'s note as IT admin — only the owner can change it.</Text></View> : null}
            {!readOnly ? <Segmented value={kind} onChange={touch(setKind)} options={[{ value: 'note', label: 'Note', icon: 'sticky-note-2' }, { value: 'meeting', label: 'Meeting', icon: 'groups' }]} /> : null}
            <TextInput value={title} onChangeText={touch(setTitle)} editable={!readOnly} placeholder={kind === 'meeting' ? 'Meeting title, e.g. Weekly IT review' : 'Title'} placeholderTextColor={T.muted} maxLength={250}
              style={[n.titleInput, WEB && ({ outlineStyle: 'none' } as any)]} accessibilityLabel="Title" />
            {kind === 'meeting' ? (
              <View style={[n.row2, phone && { flexDirection: 'column' }]}>
                <Field label="Date" style={{ flex: 1 }}><DateInput value={date} onChange={touch(setDate)} title="Meeting date" /></Field>
                <Field label="Time" style={{ width: phone ? undefined : 110 }}><Input value={time} onChangeText={touch(setTime)} placeholder="16:30" editable={!readOnly} maxLength={5} /></Field>
                <Field label="Place" style={{ flex: 1 }}><Input value={place} onChangeText={touch(setPlace)} placeholder="Room / online" editable={!readOnly} maxLength={200} /></Field>
              </View>
            ) : null}
            {kind === 'meeting' ? <Field label="Attendees"><Input value={attendees} onChangeText={touch(setAttendees)} placeholder="Names, comma separated" editable={!readOnly} maxLength={1000} /></Field> : null}
            <Field label={kind === 'meeting' ? 'Discussion points' : 'Note'}>
              <TextInput value={body} onChangeText={touch(setBody)} editable={!readOnly} multiline placeholder={kind === 'meeting' ? '• What was discussed…' : 'Write anything you want to remember…'} placeholderTextColor={T.muted}
                style={[n.area, WEB && ({ outlineStyle: 'none' } as any)]} textAlignVertical="top" accessibilityLabel="Note text" />
            </Field>
            {kind === 'meeting' || decisions ? (
              <Field label="Decisions" hint="One decision per line — they are numbered in Copy / Excel">
                <TextInput value={decisions} onChangeText={touch(setDecisions)} editable={!readOnly} multiline placeholder="e.g. Buy 2 new label printers" placeholderTextColor={T.muted}
                  style={[n.area, { minHeight: 80 }, WEB && ({ outlineStyle: 'none' } as any)]} textAlignVertical="top" accessibilityLabel="Decisions" />
              </Field>
            ) : null}
            {kind === 'meeting' || acts.length ? (
              <View style={{ gap: 6 }}>
                <Text style={n.label}>ACTION ITEMS {acts.length ? `· ${acts.filter((a) => a.done).length}/${acts.length} done` : ''}</Text>
                {acts.map((a, i) => (
                  <View key={i} style={[n.act, phone && { flexWrap: 'wrap' }]}>
                    <TouchableOpacity disabled={readOnly} onPress={touch(() => setActs((cur) => cur.map((x, j) => (j === i ? { ...x, done: !x.done } : x))))} accessibilityRole="checkbox" accessibilityState={{ checked: a.done }}>
                      <Icon name={a.done ? 'check-box' : 'check-box-outline-blank'} size={22} color={a.done ? T.green : T.muted} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, minWidth: phone ? '80%' as any : 160 }}><Input compact value={a.text} editable={!readOnly} onChangeText={touch((t: string) => setActs((cur) => cur.map((x, j) => (j === i ? { ...x, text: t } : x))))} placeholder="What needs to be done" style={a.done ? { textDecorationLine: 'line-through', color: T.muted } as any : undefined} /></View>
                    <View style={{ width: phone ? '45%' as any : 120 }}><Input compact value={a.who} editable={!readOnly} onChangeText={touch((t: string) => setActs((cur) => cur.map((x, j) => (j === i ? { ...x, who: t } : x))))} placeholder="Who" /></View>
                    <View style={{ width: phone ? '40%' as any : 140 }}><DateInput value={a.due} onChange={touch((v: number | null) => setActs((cur) => cur.map((x, j) => (j === i ? { ...x, due: v } : x))))} placeholder="By when" title="Due date" /></View>
                    {!readOnly ? <IconBtn icon="close" label="Remove action" onPress={touch(() => setActs((cur) => cur.filter((_, j) => j !== i)))} /> : null}
                  </View>
                ))}
                {!readOnly ? <Btn small kind="ghost" icon="add-task" title="Add action item" onPress={touch(() => setActs((cur) => [...cur, { text: '', who: '', due: null, done: false }]))} style={{ alignSelf: 'flex-start' }} /> : null}
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              <Text style={n.label}>PICTURES & FILES {files.length - removed.length + added.length ? `· ${files.length - removed.length + added.length}` : ''}</Text>
              {pics.length ? (
                <View style={n.pics}>
                  {pics.map((f) => (
                    <View key={f.id} style={n.pic}>
                      <Pressable onPress={() => openLink(fileUrl(base, f.url))} style={{ flex: 1 }} accessibilityLabel={`Open ${f.name}`}><Image source={{ uri: fileUrl(base, f.url) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /></Pressable>
                      {!readOnly ? <TouchableOpacity style={n.picX} onPress={touch(() => setRemoved((cur) => [...cur, f.id]))} accessibilityLabel={`Remove ${f.name}`}><Icon name="close" size={14} color="#fff" /></TouchableOpacity> : null}
                    </View>
                  ))}
                </View>
              ) : null}
              {docs.map((f) => {
                const look = fileLook(f.name, f.mime);
                return (
                  <View key={f.id} style={n.file}>
                    <Icon name={look.icon as any} size={18} color={look.color} />
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => openLink(fileUrl(base, f.download_url))}><Text style={n.fileName} numberOfLines={1}>{f.name}</Text><Text style={n.meta}>{look.label} · {fmtBytes(f.size)}</Text></TouchableOpacity>
                    <IconBtn icon="file-download" label={`Download ${f.name}`} onPress={() => openLink(fileUrl(base, f.download_url))} />
                    {!readOnly ? <IconBtn icon="delete-outline" label={`Remove ${f.name}`} onPress={touch(() => setRemoved((cur) => [...cur, f.id]))} /> : null}
                  </View>
                );
              })}
              {added.map((f) => {
                const look = fileLook(f.name, f.mime);
                return (
                  <View key={f.key} style={[n.file, { borderStyle: 'dashed' }]}>
                    {f.uri && /^image\//.test(f.mime) ? <Image source={{ uri: f.uri }} style={{ width: 28, height: 28, borderRadius: 4 }} /> : <Icon name={look.icon as any} size={18} color={look.color} />}
                    <View style={{ flex: 1 }}><Text style={n.fileName} numberOfLines={1}>{f.name}</Text><Text style={n.meta}>{fmtBytes(f.size)} · uploads on Save</Text></View>
                    <IconBtn icon="close" label={`Remove ${f.name}`} onPress={() => setAdded((cur) => cur.filter((x) => x.key !== f.key))} />
                  </View>
                );
              })}
              {pct !== null ? <View style={n.progress}><View style={[n.progressBar, { width: `${Math.round(pct * 100)}%` as any }]} /></View> : null}
              {!readOnly ? (
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Btn small kind="ghost" icon="photo-library" title="Pictures" onPress={() => void pick(pickPhotos)} />
                  {!WEB ? <Btn small kind="ghost" icon="photo-camera" title="Camera" onPress={() => void pick(takePicture)} /> : null}
                  <Btn small kind="ghost" icon="attach-file" title="Files" onPress={() => void pick(() => pickFiles(true))} />
                  <Btn small kind="ghost" icon="content-paste" title="Paste" onPress={async () => {
                    try { const l = await pasteFromClipboard(); if (!l.length) void AppAlert.alert('Nothing to paste', WEB ? 'Copy a picture first, or press Ctrl+V (⌘V) inside the note.' : 'Copy a picture first, then tap Paste.'); else addFiles(l); }
                    catch { void AppAlert.alert('Could not paste', 'Press Ctrl+V (⌘V) inside the note instead.'); }
                  }} />
                </View>
              ) : null}
              {WEB && !readOnly ? <Text style={n.meta}>Tip: paste (Ctrl+V) or drop pictures and files straight into this note.</Text> : null}
            </View>

            <View style={[n.row2, phone && { flexDirection: 'column' }]}>
              <Field label="Tags" style={{ flex: 1 }}><Input value={tags} onChangeText={touch(setTags)} placeholder="e.g. weekly, printers" editable={!readOnly} /></Field>
              {!readOnly ? (
                <Field label="Colour">
                  <View style={{ flexDirection: 'row', gap: 6, paddingTop: 4 }}>
                    {COLORS.map((c) => (
                      <TouchableOpacity key={c || 'none'} onPress={touch(() => setColor(c))} style={[n.color, { backgroundColor: c || T.surface }, color === c && n.colorOn]} accessibilityLabel={c ? `Colour ${c}` : 'No colour'}>
                        {!c ? <Icon name="block" size={14} color={T.muted} /> : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>
              ) : null}
              {!readOnly ? (
                <Field label="Pin on top">
                  <Switch value={pinned} onValueChange={touch(setPinned)} trackColor={{ true: T.copper, false: T.border }} thumbColor="#fff" />
                </Field>
              ) : null}
            </View>
          </ScrollView>
        </View>
      )}
      {note ? <SendToChat visible={sendTo} onClose={() => setSendTo(false)} api={api} noteId={note.id} /> : null}
    </Panel>
  );
}

function SendToChat({ visible, onClose, api, noteId }: { visible: boolean; onClose: () => void; api: SupportCall; noteId: number }) {
  const rooms = useChat((s) => s.rooms);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(0);
  useEffect(() => { if (visible && !useChat.getState().rooms.length) void useChat.getState().loadRooms(); }, [visible]);
  const list = rooms.filter((r) => r.is_member || r.kind === 'team' || r.kind === 'help').filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()));
  const send = async (roomId: number, name: string) => {
    setBusy(roomId);
    try { await api('notes.send', { id: noteId, room_id: roomId }, { timeout: 120000 }); toast(`Sent to ${name}`, 'ok'); useChat.getState().refreshRooms(100); onClose(); }
    catch (e: any) { void AppAlert.alert('Could not send', e?.message || ''); } finally { setBusy(0); }
  };
  return (
    <Dialog visible={visible} onClose={onClose} title="Send note to a chat" width={420}>
      <Input value={q} onChangeText={setQ} placeholder="Search chats…" icon="search" />
      <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 4, paddingVertical: 6 }}>
        {list.map((r) => (
          <TouchableOpacity key={r.id} onPress={() => void send(r.id, r.name)} style={n.room} disabled={!!busy}>
            <Icon name={r.kind === 'team' ? 'groups' : r.kind === 'help' ? 'support-agent' : r.kind === 'group' ? 'workspaces' : 'person'} size={20} color={T.nav} />
            <View style={{ flex: 1 }}><Text style={n.fileName} numberOfLines={1}>{r.name}</Text><Text style={n.meta} numberOfLines={1}>{r.sub}</Text></View>
            {busy === r.id ? <ActivityIndicator color={T.copper} /> : <Icon name="send" size={18} color={T.copper} />}
          </TouchableOpacity>
        ))}
        {!list.length ? <Text style={n.meta}>No chats yet.</Text> : null}
      </ScrollView>
      <Text style={n.meta}>The note goes as text with its pictures and files.</Text>
    </Dialog>
  );
}

const n = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  count: { fontSize: 11.5, fontWeight: '800', color: T.muted },
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, gap: 6, overflow: 'hidden', minHeight: 120 },
  strip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  kindText: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.8 },
  title: { fontSize: 14.5, fontWeight: '900', color: T.ink },
  preview: { fontSize: 12.5, fontWeight: '600', color: T.muted, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 20, paddingHorizontal: 7, borderRadius: 6, backgroundColor: T.alt },
  chipText: { fontSize: 10.5, fontWeight: '800', color: T.muted },
  meta: { fontSize: 11, fontWeight: '700', color: T.muted },
  ro: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: `${T.blue}10` },
  roText: { flex: 1, fontSize: 12, fontWeight: '700', color: T.ink },
  titleInput: { fontSize: 19, fontWeight: '900', color: T.ink, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.border },
  row2: { flexDirection: 'row', gap: 10 },
  area: { minHeight: 120, maxHeight: 360, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.bg, padding: 10, fontSize: 14, color: T.ink, lineHeight: 20 },
  label: { fontSize: 11, fontWeight: '900', color: T.muted, letterSpacing: 0.6 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pic: { width: 96, height: 96, borderRadius: 10, overflow: 'hidden', backgroundColor: T.alt },
  picX: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(13,27,42,0.7)', alignItems: 'center', justifyContent: 'center' },
  file: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  fileName: { fontSize: 12.5, fontWeight: '800', color: T.ink },
  progress: { height: 5, borderRadius: 3, backgroundColor: T.border, overflow: 'hidden' },
  progressBar: { height: 5, backgroundColor: T.blue },
  color: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  colorOn: { borderWidth: 3, borderColor: T.nav },
  room: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: T.border },
});
