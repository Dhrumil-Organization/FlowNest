// FILE: src/features/support/screens/ItDeskApp.tsx
// IT DESK — the IT team's own software inside FlowNest.
//   • own login (admin from the server .env, members created by the admin), one session per login
//   • board (drag & drop) + list, live for everybody (WebSocket, with automatic fallback)
//   • every task / ticket of the whole team visible; each member edits his own (admin: all)
//   • tickets raised by FlowNest users arrive live in "To do"; a member takes it, works, resolves
//   • search with instant "no match" (Bloom filter), filters
//   • History: by day / month / year / range, exact totals, lazy list — years of work stay fast
//   • Excel: any period, daily layout like the IT sheet (coloured by status) + Summary sheet
//   • Done needs the actual time (and a resolution note for user tickets)
import AsyncStorage from '@/common/utils/compatibleStorage';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { itApi, itLogin, SupportCall } from '../api';
import { useChat } from '../chatStore';
import { downloadExcel } from '../download';
import { Overview, useItDesk, View as DeskView } from '../itStore';
import { activeFilterCount, EMPTY_FILTERS, Filters, filtersToParams, ItUser, periodParams, Status, TeamPerson, Ticket } from '../model';
import { moduleOptions, ModuleOption } from '../modules';
import { LiveStatus, LiveSync } from '../realtime';
import { useLivePulse } from '../livePulse';
import { SettingsView } from '../components/SettingsView';
import { StorageView } from '../components/StorageView';
import { ServerView } from '../components/ServerView';
import { NotesView } from '../components/NotesView';
import { NoticeBell, refreshNoticeCount, useNotices } from '../components/NoticeBell';
import { ChatBanner } from '../components/ChatBanner';
import { quietRegister } from '../push';
import { Board } from '../components/Board';
import { DoneDialog } from '../components/DoneDialog';
import { ExportChoice, ExportDialog } from '../components/ExportDialog';
import { HistoryView } from '../components/HistoryView';
import { TeamView } from '../components/TeamView';
import { ActivityView } from '../components/ActivityView';
import { ChatView } from '../components/ChatView';
import { BottomNav, navItems, Section, Sidebar } from '../components/Sidebar';
import { FiltersPanel } from '../components/FiltersPanel';
import { ListView } from '../components/ListView';
import { Shell } from '../components/Shell';
import { TicketDetailView } from '../components/TicketDetail';
import { FormPicture, TicketForm } from '../components/TicketForm';
import { Avatar, Btn, Dialog, Field, IconBtn, Input, Panel, Segmented, toast, useLayout } from '../components/ui';
import { UsersPanel } from '../components/UsersPanel';

const hostKey = (base: string) => String(base || '').replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
/** ends with _token -> kept in the secure store on phones */
const tokenKey = (base: string) => `support_${hostKey(base)}_it_token`;
const VIEW_KEY = 'support_it_view';
const DENSITY_KEY = 'support_it_density';
const FOLD_KEY = 'support_it_fold';
const SUMMARY_KEY = 'support_it_summary';

type Props = { base: string; onExit: () => void; canAccess: (path: string) => boolean; link?: { ticket?: number; chat?: number; note?: number } | null };

export function ItDeskApp({ base, onExit, canAccess, link }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(tokenKey(base)).then((t: string | null) => { if (alive) { setToken(t || null); setReady(true); } }).catch(() => alive && setReady(true));
    return () => { alive = false; };
  }, [base]);
  const saveToken = async (t: string | null) => {
    setToken(t);
    try { if (t) await AsyncStorage.setItem(tokenKey(base), t); else await AsyncStorage.removeItem(tokenKey(base)); } catch { /* ignore */ }
  };

  if (!ready) return <Shell title="IT Desk" icon="support-agent" accent={T.copper} onBack={onExit}><ActivityIndicator color={T.copper} style={{ marginTop: 60 }} /></Shell>;
  if (!token) return <ItLogin base={base} onExit={onExit} onLoggedIn={(t) => saveToken(t)} />;
  return <ItDesk key={token} base={base} token={token} onExit={onExit} onLogout={() => saveToken(null)} canAccess={canAccess} link={link} />;
}

/* ------------------------------- login -------------------------------- */
function ItLogin({ base, onExit, onLoggedIn }: { base: string; onExit: () => void; onLoggedIn: (t: string) => void }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    if (busy) return;
    setErr('');
    setBusy(true);
    try {
      const r = await itLogin(base, u, p);
      onLoggedIn(r.token);
    } catch (e: any) {
      setErr(e?.message || 'Could not log in.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title="IT Desk" subtitle="Internal IT team" icon="support-agent" accent={T.copper} onBack={onExit}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={lg.wrap} keyboardShouldPersistTaps="handled">
          <View style={lg.card}>
            <View style={lg.logo}><Icon name="support-agent" size={34} color="#fff" /></View>
            <Text style={lg.title}>IT Desk login</Text>
            <Text style={lg.sub}>Separate from your FlowNest login. Ask the IT admin for your username.</Text>
            <Field label="Username"><Input value={u} onChangeText={setU} placeholder="username" autoCapitalize="none" autoCorrect={false} icon="person" onSubmitEditing={go} returnKeyType="next" /></Field>
            <Field label="Password" error={err}>
              <Input value={p} onChangeText={setP} placeholder="password" secureTextEntry={!show} autoCapitalize="none" icon="lock" onSubmitEditing={go} returnKeyType="go"
                right={<TouchableOpacity onPress={() => setShow((x) => !x)} accessibilityLabel={show ? 'Hide password' : 'Show password'}><Icon name={show ? 'visibility-off' : 'visibility'} size={18} color={T.muted} /></TouchableOpacity>} />
            </Field>
            <Btn title="Log in" icon="login" onPress={go} busy={busy} disabled={!u.trim() || !p} style={{ marginTop: 4 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Shell>
  );
}

/* -------------------------------- desk -------------------------------- */
export type DeepLink = { ticket?: number; chat?: number; note?: number } | null;
function ItDesk({ base, token, onExit, onLogout, canAccess, link }: { base: string; token: string; onExit: () => void; onLogout: () => void; canAccess: (p: string) => boolean; link?: DeepLink }) {
  const { phone, wide } = useLayout();
  const api: SupportCall = useMemo(() => itApi(base, token), [base, token]);
  const store = useItDesk();
  const { me, users, overview, filters, gen, counts } = store;
  const [boot, setBoot] = useState<'loading' | 'ok' | 'error'>('loading');
  const [bootErr, setBootErr] = useState('');
  const [live, setLive] = useState<LiveStatus>('connecting');
  const [view, setViewState] = useState<DeskView>(phone ? 'list' : 'board');
  const setView = (v: DeskView) => { setViewState(v); useItDesk.getState().setView(v); };
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [newIn, setNewIn] = useState<Status | null>(null);
  const [newPics, setNewPics] = useState<FormPicture[]>([]);
  const [creating, setCreating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pwd, setPwd] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [resolve, setResolve] = useState<{ t: Ticket; go: (note: string, spent: number) => void; undo: () => void } | null>(null);
  const sync = useRef<LiveSync | null>(null);
  const modules: ModuleOption[] = useMemo(() => moduleOptions(canAccess), [canAccess]);
  const [density, setDensity] = useState<'cards' | 'lines'>('cards');
  const [folded, setFolded] = useState(false);
  const [summary, setSummary] = useState(true);
  const unread = useChat((s) => s.unread);
  const chatOpen = useChat((s) => s.activeId !== null) && phone; // phone: a chat uses the whole screen (like WhatsApp)
  const lastUnread = useRef(0);
  // limits / rules from the admin's Settings (live: changes reach every app at once)
  const [pub, setPub] = useState<Record<string, any>>({});
  const lastRev = useRef(0);
  const settingsSig = useRef('');
  const applyPublic = (p: Record<string, any> | undefined) => {
    if (!p) return;
    setPub(p);
    useChat.getState().setLimits({ max_upload_mb: p.max_upload_mb, max_files_per_message: p.max_files_per_message, blocked_extensions: p.blocked_extensions });
    const m = useItDesk.getState().meta;
    if (m) useItDesk.setState({ meta: { ...m, actual_time_required: p.actual_time_required, settings: p } });
  };
  const [openNote, setOpenNote] = useState<number | null>(null);
  // a notification / bell / deep link -> the right place
  const openLink = (l: { ticket_id?: number; room_id?: number; note_id?: number }) => {
    if (l.ticket_id) setOpenId(l.ticket_id);
    else if (l.room_id) { changeView('chat'); void useChat.getState().loadRooms().then(() => useChat.getState().open(l.room_id!)); }
    else if (l.note_id) { changeView('notes'); setOpenNote(l.note_id); }
  };
  const reloadSettings = () => { void api<{ public: Record<string, any> }>('settings.get').then((r) => applyPublic(r.public)).catch(() => {}); };
  useEffect(() => {
    void (async () => {
      try {
        const [d, f, sm] = await Promise.all([AsyncStorage.getItem(DENSITY_KEY), AsyncStorage.getItem(FOLD_KEY), AsyncStorage.getItem(SUMMARY_KEY)]);
        if (d === 'lines' || d === 'cards') setDensity(d);
        if (f === '1') setFolded(true);
        if (sm === '0') setSummary(false);
      } catch { /* defaults */ }
    })();
  }, []);
  const saveDensity = (d: 'cards' | 'lines') => { setDensity(d); AsyncStorage.setItem(DENSITY_KEY, d).catch(() => {}); };
  const toggleFold = () => { setFolded((x) => { AsyncStorage.setItem(FOLD_KEY, x ? '0' : '1').catch(() => {}); return !x; }); };
  const toggleSummary = () => { setSummary((x) => { AsyncStorage.setItem(SUMMARY_KEY, x ? '0' : '1').catch(() => {}); return !x; }); };

  // start: who am I, team, board, search filter, live updates
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api<{ user: ItUser; users: ItUser[]; overview: Overview; meta: any; rev: number }>('me');
        if (!alive) return;
        useItDesk.getState().reset();
        useItDesk.getState().init(api, r.user, r.users, r.meta, r.overview);
        try {
          const v = await AsyncStorage.getItem(VIEW_KEY);
          if (v === 'board' || v === 'list' || v === 'history' || v === 'team' || v === 'chat' || v === 'notes' || (['activity', 'settings', 'storage', 'server'].includes(v || '') && r.user.role === 'admin')) setView(v as DeskView); else setView(view);
        } catch { /* ignore */ }
        // chat: uploads go straight to the server with this login (big files in pieces)
        useChat.getState().reset();
        useChat.getState().init(api, { base, realm: 'it', headers: { 'X-Support-Token': token }, api }, `it:${r.user.id}`, 'it');
        applyPublic(r.meta?.settings);
        lastRev.current = r.rev;
        useNotices.setState({ unread: (r as any).notices || 0, items: [], loaded: false });
        void quietRegister(api); // keeps this device's notification token fresh (no pop-up)
        void useChat.getState().loadRooms();
        setBoot('ok');
        void useItDesk.getState().loadBloom();
        sync.current = new LiveSync({
          startRev: r.rev,
          getPass: async () => (await api<{ realtime: any }>('realtime')).realtime,
          fetchChanges: (since) => api('changes', { since }),
          onTickets: (items) => useItDesk.getState().queueTickets(items),
          onEvent: (ev) => {
            if (ev.type === 'users') void api<{ users: ItUser[] }>('users.list').then((x) => useItDesk.getState().setUsers(x.users)).catch(() => {});
            if (ev.type === 'chat') useChat.getState().onEvent(ev);
            if (ev.type === 'settings') reloadSettings();
            if (ev.type === 'notice') void refreshNoticeCount(api);
          },
          onStatus: setLive,
          pollMs: 60000, // the fast pulse below covers the gaps
        }).start();
      } catch (e: any) {
        if (!alive) return;
        if (e?.status === 401) { toast(e.message, 'err'); onLogout(); return; }
        setBootErr(e?.message || 'Could not open the IT Desk.');
        setBoot('error');
      }
    })();
    return () => { alive = false; sync.current?.stop(); sync.current = null; useChat.getState().reset(); };
  }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  // no WebSocket -> a tiny pulse every 1–3 s keeps chat, ticks, board and settings live
  useLivePulse(boot === 'ok' && live !== 'live', Number(pub.poll_seconds) || 2, (r) => {
    if (r.rev !== lastRev.current) { lastRev.current = r.rev; void sync.current?.sync(); }
    if (settingsSig.current && r.settings !== settingsSig.current) reloadSettings();
    settingsSig.current = r.settings;
    if (typeof r.notices === 'number' && r.notices !== useNotices.getState().unread) void refreshNoticeCount(api);
  });
  // opened from a notification (?ticket= / ?chat= / ?note=)
  useEffect(() => {
    if (boot !== 'ok' || !link) return;
    openLink({ ticket_id: link.ticket, room_id: link.chat, note_id: link.note });
  }, [boot, link?.ticket, link?.chat, link?.note]); // eslint-disable-line react-hooks/exhaustive-deps
  // new chat messages: the in-app banner (ChatBanner) — accurate per chat, real time

  // reload the visible view whenever the filters change
  useEffect(() => {
    if (boot !== 'ok') return;
    if (view === 'board') void store.reloadBoard();
    else if (view === 'history') void store.loadHistory(true);
    else if (view === 'team') void store.loadTeam();
    else if (view === 'list') void store.loadList(true);
  }, [gen, view, boot]); // eslint-disable-line react-hooks/exhaustive-deps

  // search: typed words go to the filter after a short pause
  useEffect(() => {
    const t = setTimeout(() => { if (search !== filters.q) store.setFilters({ q: search }); }, 280);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeView = (v: DeskView) => { setView(v); AsyncStorage.setItem(VIEW_KEY, v).catch(() => {}); };
  const timeRequired = store.meta?.actual_time_required !== false;

  const onDrop = useCallback((t: Ticket, to: Status, index: number) => {
    const toDone = to === 'done' && t.status !== 'done';
    const needNote = toDone && t.kind === 'ticket' && !t.has_resolution;
    const needTime = toDone && timeRequired && !t.spent_min;
    const { before, after, undo } = useItDesk.getState().moveLocal(t.id, to, index);
    const go = async (n = '', spent = 0) => {
      try {
        const r = await api<{ ticket: Ticket }>('tickets.move', { id: t.id, status: to, before_id: before, after_id: after, note: n, spent_min: spent || '' });
        useItDesk.getState().applyTickets([r.ticket]);
      } catch (e: any) {
        undo();
        toast(e?.message || 'Could not move the card.', 'err');
      }
    };
    if (needNote || needTime) setResolve({ t, go, undo }); else void go();
  }, [api, timeRequired]);

  const createTask = async (v: Record<string, any>) => {
    if (creating) return;
    setCreating(true);
    try {
      const r = await api<{ ticket: Ticket }>('tickets.create', { ...v, kind: 'task' });
      for (const p of newPics) await api('tickets.attach', { id: r.ticket.id, files: [{ name: p.name, data: p.uri }] }, { timeout: 120000 });
      useItDesk.getState().applyTickets([{ ...r.ticket, attachments: newPics.length }]);
      toast(`${r.ticket.no} created`, 'ok');
      setNewIn(null);
      setNewPics([]);
    } catch (e: any) {
      toast(e?.message || 'Could not create.', 'err');
    } finally {
      setCreating(false);
    }
  };

  const doExport = async (c: ExportChoice) => {
    if (exporting) return;
    setExporting(true);
    try {
      const { __filters, ...picked } = c.params;
      const fromBoard = __filters === 'no' ? {} : filtersToParams(filters);
      delete fromBoard.from; delete fromBoard.to;
      const name = await downloadExcel(base, token, { ...fromBoard, ...picked });
      setExportOpen(false);
      toast(`Excel ready — ${name}`, 'ok');
    } catch (e: any) {
      toast(e?.message || 'Export failed.', 'err');
    } finally {
      setExporting(false);
    }
  };

  // TEAM tab: whole team Excel, one person's Excel, one person's History
  const teamExcel = async (extra: Record<string, string> = {}) => {
    if (exporting) return;
    setExporting(true);
    try {
      const { assignee, q, from, to, ...f } = filtersToParams(filters) as any;
      void assignee; void q; void from; void to;
      const name = await downloadExcel(base, token, { ...f, ...periodParams(useItDesk.getState().period), ...extra });
      toast(`Excel ready — ${name}`, 'ok');
    } catch (e: any) {
      toast(e?.message || 'Export failed.', 'err');
    } finally {
      setExporting(false);
    }
  };
  const personExcel = (p: TeamPerson) => teamExcel({ assignee: p.id ? String(p.id) : 'none', layout: 'daily' });
  const personHistory = (p: TeamPerson) => {
    store.setFilters({ assignee: p.id ? String(p.id) : 'none' });
    changeView('history');
  };
  const openCard = (t: Ticket) => {
    useItDesk.setState((st) => ({ tickets: { ...st.tickets, [t.id]: st.tickets[t.id] && st.tickets[t.id].rev >= t.rev ? st.tickets[t.id] : t } }));
    setOpenId(t.id);
  };

  const logout = async () => {
    setMenu(false);
    try { await api('logout'); } catch { /* ignore */ }
    useItDesk.getState().reset();
    onLogout();
  };

  /** a number tile; tapping it applies its filter (tap again to remove it). apply = null: information only */
  const tile = (key: keyof Overview, label: string, icon: string, color: string, apply: Partial<Filters> | null) => {
    const n = overview ? overview[key] : 0;
    const on = !!apply && Object.keys(apply).length > 0 && (Object.keys(apply) as (keyof Filters)[]).every((k) => filters[k] === apply[k]);
    return (
      <TouchableOpacity key={key} disabled={!apply} style={[ds.tile, wide && { flex: 1 }, on && { borderColor: color, backgroundColor: `${color}0E` }]} activeOpacity={0.8}
        onPress={() => apply && store.setFilters(on ? Object.fromEntries(Object.keys(apply).map((k) => [k, ''])) as any : { ...EMPTY_FILTERS, q: filters.q, ...apply })}>
        <View style={[ds.tileIcon, { backgroundColor: `${color}18` }]}><Icon name={icon as any} size={18} color={color} /></View>
        <View style={{ minWidth: 0 }}>
          <Text style={[ds.tileNum, { color }]}>{n}</Text>
          <Text style={ds.tileLabel} numberOfLines={1}>{label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const fc = activeFilterCount(filters);
  const right = me ? (
    <>
      <NoticeBell api={api} admin={me.role === 'admin'} onOpen={openLink} />
      {me.role === 'admin' ? <IconBtn tone="dark" icon="group" label="IT team" onPress={() => setShowUsers(true)} /> : null}
      <TouchableOpacity onPress={() => setMenu(true)} style={ds.me} accessibilityLabel="My account">
        <Avatar name={me.name} id={me.id} color={me.color} size={30} />
        {wide ? <Text style={ds.meName} numberOfLines={1}>{me.name}</Text> : null}
      </TouchableOpacity>
    </>
  ) : null;

  if (boot === 'loading') return <Shell title="IT Desk" icon="support-agent" accent={T.copper} onBack={onExit}><ActivityIndicator color={T.copper} style={{ marginTop: 60 }} /></Shell>;
  if (boot === 'error' || !me) {
    return (
      <Shell title="IT Desk" icon="support-agent" accent={T.copper} onBack={onExit}>
        <View style={{ padding: 24, alignItems: 'center', gap: 12 }}>
          <Text style={{ color: T.red, fontWeight: '800', textAlign: 'center' }}>{bootErr}</Text>
          <Btn title="Log out" kind="ghost" onPress={onLogout} small />
        </View>
      </Shell>
    );
  }

  const nav = navItems(me.role === 'admin', unread);
  const work = view === 'board' || view === 'list' || view === 'history';
  const section = (v: Section) => changeView(v);

  return (
    <Shell title="IT Desk" subtitle={`${users.filter((u) => u.active).length} team members · tasks, user tickets, chat`} icon="support-agent" accent={T.copper} live={live} onBack={onExit} right={right}>
      <View style={{ flex: 1, flexDirection: 'row', minHeight: 0 }}>
        <Sidebar items={nav} value={view} onChange={section} folded={folded} onFold={toggleFold} />
        <View style={[ds.page, phone && { padding: 8, gap: 8 }]}>
          {work && (view !== 'history') ? (
            <View>
              <TouchableOpacity onPress={toggleSummary} style={ds.sumToggle} accessibilityRole="button" accessibilityLabel={summary ? 'Hide the summary' : 'Show the summary'}>
                <Text style={ds.sumText}>SUMMARY</Text>
                <Icon name={summary ? 'expand-less' : 'expand-more'} size={16} color={T.muted} />
              </TouchableOpacity>
              {summary ? (
                <ScrollView horizontal={!wide} showsHorizontalScrollIndicator={false} contentContainerStyle={[ds.tiles, wide && { flex: 1 }]} style={{ flexGrow: 0 }}>
                  {tile('new_tickets', 'New user tickets', 'mark-email-unread', T.copper, { kind: 'ticket', assignee: 'none' })}
                  {tile('my_open', 'My open work', 'person', T.blue, { assignee: 'me' })}
                  {tile('overdue', 'Overdue', 'alarm', T.red, { due: 'overdue' })}
                  {tile('open_total', 'Open in total', 'inbox', T.purple, null)}
                  {tile('done_today', 'Done today', 'task-alt', T.green, null)}
                </ScrollView>
              ) : null}
            </View>
          ) : null}

          {work ? (
            <View style={[ds.toolbar, phone && { flexWrap: 'wrap' }]}>
              <View style={[{ flex: 1, minWidth: phone ? '100%' : 220 }]}>
                <Input value={search} onChangeText={setSearch} placeholder="Search number, title, user, module, label…" icon="search" autoCorrect={false}
                  right={search ? <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Clear search"><Icon name="cancel" size={17} color={T.muted} /></TouchableOpacity> : null} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {view === 'board' ? (
                  <Segmented value={density} onChange={saveDensity} options={[{ value: 'cards', label: phone ? '' : 'Cards', icon: 'view-agenda' }, { value: 'lines', label: phone ? '' : 'Lines', icon: 'view-headline' }]} />
                ) : null}
                <Btn small kind="ghost" title={fc ? `Filters · ${fc}` : 'Filters'} icon="filter-alt" onPress={() => setShowFilters(true)} style={fc ? { borderColor: T.copper } : undefined} />
                {fc ? <Btn small kind="ghost" title="Clear" icon="filter-alt-off" onPress={() => { store.setFilters({ ...EMPTY_FILTERS, q: filters.q }); }} /> : null}
                <Btn small kind="success" title="Excel" icon="file-download" onPress={() => setExportOpen(true)} busy={exporting} />
                {!phone ? <Btn small title="New task" icon="add" onPress={() => setNewIn('todo')} /> : null}
              </View>
            </View>
          ) : null}
          {work && store.noMatch ? <Text style={ds.instant}><Icon name="bolt" size={13} color={T.amber} /> No card contains “{filters.q}” — answered instantly by the search index.</Text> : null}

          <View style={{ flex: 1, minHeight: 0 }}>
            {view === 'board' ? <Board onOpen={(t) => setOpenId(t.id)} onDrop={onDrop} onAdd={(s) => setNewIn(s)} onHistory={() => changeView('history')} dense={density === 'lines'} />
              : view === 'history' ? <HistoryView onOpen={(t) => setOpenId(t.id)} onExport={() => setExportOpen(true)} />
              : view === 'team' ? <TeamView api={api} onExport={() => void teamExcel({ report: 'team' })} exporting={exporting} onPersonExcel={personExcel} onPersonHistory={personHistory} onOpenCard={openCard} cardOpen={openId !== null} />
              : view === 'chat' ? <ChatView base={base} live={live} admin={me.role === 'admin'} canGroup={me.role === 'admin' || pub.member_groups !== false} />
              : view === 'activity' ? <ActivityView api={api} onOpenTicket={(id) => setOpenId(id)} />
              : view === 'notes' ? <NotesView api={api} base={base} admin={me.role === 'admin'} upload={useChat.getState().upload} openId={openNote} onOpened={() => setOpenNote(null)}
                  onExcel={async (p) => { const name = await downloadExcel(base, token, p); toast(`Excel ready — ${name}`, 'ok'); }} />
              : view === 'settings' && me.role === 'admin' ? <SettingsView api={api} onSaved={applyPublic} />
              : view === 'storage' && me.role === 'admin' ? <StorageView api={api} base={base} onOpenTicket={(id) => setOpenId(id)} />
              : view === 'server' && me.role === 'admin' ? <ServerView api={api} live={live} onStorage={() => changeView('storage')} />
              : <ListView onOpen={(t) => setOpenId(t.id)} />}
          </View>
          {(view === 'list' || view === 'history') && phone ? (
            <TouchableOpacity style={ds.fab} onPress={() => setNewIn('todo')} accessibilityLabel="New task"><Icon name="add" size={26} color="#fff" /></TouchableOpacity>
          ) : null}
        </View>
      </View>
      {!(view === 'chat' && chatOpen) ? <BottomNav items={nav} value={view} onChange={section} /> : null}
      <ChatBanner onOpen={(roomId) => openLink({ room_id: roomId })} />

      <Panel visible={openId !== null} onClose={() => setOpenId(null)} title={openId ? (store.tickets[openId]?.no || `#${openId}`) : ''} subtitle={openId ? store.tickets[openId]?.title : ''} width={640}>
        {openId !== null ? (
          <TicketDetailView
            realm="it" api={api} base={base} id={openId} rev={store.tickets[openId]?.rev}
            me={me} users={users} modules={modules} actualTimeRequired={timeRequired} uploadHeaders={{ 'X-Support-Token': token }} limits={useChat.getState().limits}
            onChanged={(t) => useItDesk.getState().applyTickets([t])}
            onDeleted={(id) => { const t = useItDesk.getState().tickets[id]; if (t) useItDesk.getState().applyTickets([{ ...t, deleted: true }]); }}
            onClose={() => setOpenId(null)}
          />
        ) : null}
      </Panel>

      <Panel visible={newIn !== null} onClose={() => setNewIn(null)} title="New task" subtitle="Visible to the whole IT team at once" width={620}>
        {newIn !== null ? (
          <TicketForm realm="it" status={newIn} users={users} me={me} modules={modules} pictures={newPics} onPictures={setNewPics} busy={creating} onCancel={() => setNewIn(null)} onSubmit={createTask} actualTimeRequired={timeRequired} />
        ) : null}
      </Panel>

      <FiltersPanel visible={showFilters} onClose={() => setShowFilters(false)} value={filters} onApply={(f) => store.setFilters({ ...f, q: filters.q })} users={users} modules={modules} />
      {me.role === 'admin' ? <UsersPanel visible={showUsers} onClose={() => setShowUsers(false)} api={api} users={users} onUsers={store.setUsers} me={me} /> : null}

      <DoneDialog ticket={resolve?.t || null} requireTime={timeRequired}
        onCancel={() => { resolve?.undo(); setResolve(null); }}
        onConfirm={(v) => { resolve?.go(v.note, v.spent_min); setResolve(null); }} />
      <ExportDialog visible={exportOpen} onClose={() => setExportOpen(false)} onExport={doExport} busy={exporting} realm="it"
        current={view === 'history' ? store.period : null} filterCount={fc} kind={filters.kind} />

      <Dialog visible={menu} onClose={() => setMenu(false)} title={me.name} width={340}>
        <Text style={ds.hint}>@{me.username} · {me.role === 'admin' ? 'IT admin' : 'IT team member'}</Text>
        <View style={{ gap: 8, marginTop: 14 }}>
          {me.role !== 'admin' ? <Btn kind="ghost" title="Change password" icon="password" onPress={() => { setMenu(false); setPwd(true); }} /> : null}
          <Btn kind="ghost" title="Download Excel" icon="file-download" onPress={() => { setMenu(false); setExportOpen(true); }} />
          <Btn kind="danger" title="Log out of IT Desk" icon="logout" onPress={logout} />
        </View>
      </Dialog>
      <PasswordDialog visible={pwd} onClose={() => setPwd(false)} api={api} />
    </Shell>
  );
}

function PasswordDialog({ visible, onClose, api }: { visible: boolean; onClose: () => void; api: SupportCall }) {
  const [o, setO] = useState('');
  const [n, setN] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (visible) { setO(''); setN(''); } }, [visible]);
  return (
    <Dialog visible={visible} onClose={onClose} title="Change password"
      footer={<><Btn title="Cancel" kind="ghost" onPress={onClose} /><Btn title="Save" icon="check" busy={busy} disabled={!o || n.length < 6} onPress={async () => {
        setBusy(true);
        try { await api('password', { old: o, new: n }); toast('Password changed — other devices must log in again', 'ok'); onClose(); } catch (e: any) { toast(e?.message || 'Could not change.', 'err'); } finally { setBusy(false); }
      }} /></>}>
      <Field label="Current password"><Input value={o} onChangeText={setO} secureTextEntry autoCapitalize="none" /></Field>
      <Field label="New password" hint="At least 6 characters"><Input value={n} onChangeText={setN} secureTextEntry autoCapitalize="none" /></Field>
    </Dialog>
  );
}

const lg = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { width: '100%', maxWidth: 400, backgroundColor: T.surface, borderRadius: 18, borderWidth: 1, borderColor: T.border, padding: 22 },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '900', color: T.nav, textAlign: 'center' },
  sub: { fontSize: 12.5, color: T.muted, fontWeight: '600', textAlign: 'center', marginTop: 4, marginBottom: 18 },
});

const ds = StyleSheet.create({
  page: { flex: 1, minWidth: 0, padding: 16, gap: 10 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 150, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border },
  tileIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tileNum: { fontSize: 19, fontWeight: '900' },
  tileLabel: { fontSize: 11, fontWeight: '800', color: T.muted },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  instant: { fontSize: 12, fontWeight: '700', color: T.amber },
  sumToggle: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', marginBottom: 4 },
  sumText: { fontSize: 10, fontWeight: '900', color: T.muted, letterSpacing: 1 },
  hint: { fontSize: 12.5, color: T.muted, fontWeight: '600' },
  me: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 10, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#2A4055' },
  meName: { color: '#fff', fontSize: 12.5, fontWeight: '800', maxWidth: 140 },
  fab: { position: 'absolute', right: 18, bottom: 22, width: 56, height: 56, borderRadius: 28, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
});
