// FILE: src/features/support/components/Board.tsx
// Kanban board of the IT Desk: To do · In progress · Testing · Done.
//
// Drag & drop (web mouse, touch on phone / tablet):
//   hold the ⋮⋮ grip of a card and drag it
//     wide screen   onto any column, between any two cards
//     phone         reorder inside the open column, or drop it on a column tab at the top
//   a blue line shows where it will land; the list scrolls by itself near the top / bottom edge.
// The card moves at once (optimistic) and the server stores ONE new position; if the server
// refuses (no right / network), the card jumps back and a message is shown.
// Each column loads 40 cards at a time while scrolling (lazy), so big columns stay fast.
// "Done" shows only the last 7 / 30 / 90 days (or all) — older work is in History, so the board
// stays light even after years of work.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DONE_WINDOWS, useItDesk } from '../itStore';
import { ago, canMoveCard, devSideOf, fmtMinutes, fmtYmd, isOverdue, Status, statusOf, STATUSES, Ticket } from '../model';
import { TicketCard } from './TicketCard';
import { Empty, useLayout } from './ui';

type Rect = { x: number; y: number; w: number; h: number };
type DragState = { id: number; from: Status; fromIndex: number; grabX: number; grabY: number; cardW: number; cardH: number };
type Target = { status: Status; index: number; lineY: number; viaTab?: boolean } | null;

type Props = {
  onOpen: (t: Ticket) => void;
  onDrop: (t: Ticket, to: Status, index: number) => void;
  onAdd: (status: Status) => void;
  onHistory?: () => void;
  /** one compact line per card (lots of cards) */
  dense?: boolean;
};

const inside = (r: Rect | undefined, x: number, y: number) => !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function Board({ onOpen, onDrop, onAdd, onHistory, dense }: Props) {
  const { phone } = useLayout();
  const cols = useItDesk((s) => s.cols);
  const tickets = useItDesk((s) => s.tickets);
  const counts = useItDesk((s) => s.counts);
  const me = useItDesk((s) => s.me);
  const noMatch = useItDesk((s) => s.noMatch);
  const loadColumn = useItDesk((s) => s.loadColumn);
  const doneDays = useItDesk((s) => s.doneDays);
  const setDoneDays = useItDesk((s) => s.setDoneDays);
  const doneAll = counts?.done_all;
  const older = doneDays && doneAll !== undefined && counts ? Math.max(0, doneAll - counts.done) : 0;
  const windowPicker = (
    <View style={b.win}>
      {DONE_WINDOWS.map((d) => {
        const on = d === doneDays;
        return (
          <TouchableOpacity key={d} onPress={() => setDoneDays(d)} style={[b.winBtn, on && { backgroundColor: T.green }]} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={d ? `Done in the last ${d} days` : 'All done cards'}>
            <Text style={[b.winText, on && { color: '#fff' }]}>{d ? `${d}d` : 'All'}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
  const [tab, setTab] = useState<Status>('todo');

  // measurements (page coordinates are taken when a drag starts)
  const boardRef = useRef<View>(null);
  const colRefs = useRef<Record<string, View | null>>({});
  const scrollRefs = useRef<Record<string, ScrollView | null>>({});
  const tabRefs = useRef<Record<string, View | null>>({});
  const scrollY = useRef<Record<string, number>>({});
  const cardY = useRef<Record<string, Record<number, { y: number; h: number }>>>({});
  const rects = useRef<{ board: Rect; cols: Record<string, Rect>; tabs: Record<string, Rect> }>({ board: { x: 0, y: 0, w: 0, h: 0 }, cols: {}, tabs: {} });

  // web: hover a card -> quick preview next to the mouse (after a short pause, so it never flickers)
  const [peek, setPeek] = useState<{ t: Ticket; x: number; y: number } | null>(null);
  const peekTimer = useRef<any>(null);
  const onHover = useCallback((t: Ticket | null, e?: any) => {
    clearTimeout(peekTimer.current);
    if (!t || Platform.OS !== 'web') { setPeek(null); return; }
    const x = e?.nativeEvent?.clientX ?? 0;
    const y = e?.nativeEvent?.clientY ?? 0;
    peekTimer.current = setTimeout(() => setPeek({ t, x, y }), 450);
  }, []);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [target, setTarget] = useState<Target>(null);
  const dragRef = useRef<DragState | null>(null);
  const targetRef = useRef<Target>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const autoTimer = useRef<any>(null);

  const visible: Status[] = phone ? [tab] : STATUSES.map((s) => s.key);

  const measure = (v: View | null): Promise<Rect | null> =>
    new Promise((res) => {
      // page coordinates — the same space as the touch / mouse pageX / pageY
      if (!v || !(v as any).measure) return res(null);
      (v as any).measure((_x: number, _y: number, w: number, h: number, px: number, py: number) => res({ x: px, y: py, w, h }));
    });

  const measureAll = async () => {
    const b = await measure(boardRef.current);
    if (b) rects.current.board = b;
    const c: Record<string, Rect> = {};
    for (const s of visible) { const r = await measure(colRefs.current[s]); if (r) c[s] = r; }
    rects.current.cols = c;
    const t: Record<string, Rect> = {};
    if (phone) for (const s of STATUSES) { const r = await measure(tabRefs.current[s.key]); if (r) t[s.key] = r; }
    rects.current.tabs = t;
  };

  /** where would the card land for this pointer position */
  const computeTarget = (x: number, y: number): Target => {
    const d = dragRef.current;
    if (!d) return null;
    if (phone) for (const s of STATUSES) if (s.key !== tab && inside(rects.current.tabs[s.key], x, y)) return { status: s.key, index: 0, lineY: -1, viaTab: true };
    for (const s of visible) {
      const r = rects.current.cols[s];
      if (!inside(r, x, y)) continue;
      const ids = colsRef.current[s].ids.filter((id) => id !== d.id);
      const ys = cardY.current[s] || {};
      const top = r!.y - (scrollY.current[s] || 0);
      let index = 0;
      let lineY = 0;
      for (const id of ids) {
        const c = ys[id];
        if (!c) continue;
        if (y > top + c.y + c.h / 2) { index++; lineY = c.y + c.h + 4; } else break;
      }
      if (index === 0) lineY = ids.length && ys[ids[0]] ? Math.max(0, ys[ids[0]].y - 4) : 0;
      return { status: s, index, lineY };
    }
    return null;
  };

  const autoScroll = () => {
    clearInterval(autoTimer.current);
    autoTimer.current = setInterval(() => {
      const d = dragRef.current;
      if (!d) return;
      const { x, y } = pointer.current;
      for (const s of visible) {
        const r = rects.current.cols[s];
        if (!r || x < r.x || x > r.x + r.w) continue;
        const edge = 56;
        let dy = 0;
        if (y < r.y + edge) dy = -Math.ceil((r.y + edge - y) / 4);
        else if (y > r.y + r.h - edge) dy = Math.ceil((y - (r.y + r.h - edge)) / 4);
        if (dy) {
          const next = Math.max(0, (scrollY.current[s] || 0) + dy);
          scrollY.current[s] = next;
          scrollRefs.current[s]?.scrollTo({ y: next, animated: false });
          const t = computeTarget(x, y);
          targetRef.current = t;
          setTarget(t);
        }
      }
    }, 16);
  };

  const endDrag = (commit: boolean) => {
    clearInterval(autoTimer.current);
    const d = dragRef.current;
    const t = targetRef.current;
    dragRef.current = null;
    targetRef.current = null;
    setDrag(null);
    setGhost(null);
    setTarget(null);
    if (!commit || !d || !t) return;
    if (t.status === d.from && t.index === d.fromIndex) return; // dropped where it was
    const ticket = useItDesk.getState().tickets[d.id];
    if (ticket) onDrop(ticket, t.status, t.index);
  };

  // the drag handlers read the newest columns through this ref, so they are NOT rebuilt on every
  // live change (rebuilding them re-rendered every card on the board each time)
  const colsRef = useRef(cols);
  colsRef.current = cols;
  const responders = useRef<Record<number, any>>({});
  const handlersFor = useCallback((t: Ticket, status: Status) => {
    const key = t.id;
    if (responders.current[key]) return responders.current[key].panHandlers;
    const pr = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: async (e) => {
        const cur = useItDesk.getState();
        const st = cur.tickets[key]?.status || status;
        const ids = cur.cols[st].ids;
        const c = (cardY.current[st] || {})[key];
        const px = e.nativeEvent.pageX;
        const py = e.nativeEvent.pageY;
        pointer.current = { x: px, y: py };
        await measureAll();
        const col = rects.current.cols[st];
        const cardTop = col ? col.y - (scrollY.current[st] || 0) + (c?.y || 0) : py - 20;
        const d: DragState = { id: key, from: st, fromIndex: Math.max(0, ids.indexOf(key)), grabX: col ? px - col.x - 8 : 20, grabY: py - cardTop, cardW: col ? col.w - 16 : 280, cardH: c?.h || 90 };
        dragRef.current = d;
        setDrag(d);
        setGhost({ x: px - d.grabX - rects.current.board.x, y: py - d.grabY - rects.current.board.y });
        autoScroll();
      },
      onPanResponderMove: (e) => {
        const d = dragRef.current;
        if (!d) return;
        const px = e.nativeEvent.pageX;
        const py = e.nativeEvent.pageY;
        pointer.current = { x: px, y: py };
        setGhost({ x: px - d.grabX - rects.current.board.x, y: py - d.grabY - rects.current.board.y });
        const tg = computeTarget(px, py);
        targetRef.current = tg;
        setTarget(tg);
      },
      onPanResponderRelease: () => endDrag(true),
      onPanResponderTerminate: () => endDrag(false),
    });
    responders.current[key] = pr;
    return pr.panHandlers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, tab]);

  // handlers capture the layout mode -> rebuild them only when it changes
  useMemo(() => { responders.current = {}; }, [phone, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScrollCol = (s: Status) => (e: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (!dragRef.current) scrollY.current[s] = contentOffset.y;
    if (contentOffset.y + layoutMeasurement.height > contentSize.height - 400) void loadColumn(s);
  };

  const column = (s: Status) => {
    const meta = statusOf(s);
    const c = cols[s];
    const n = counts ? counts[s] : c.ids.length;
    const isTarget = target && !target.viaTab && target.status === s;
    return (
      <View key={s} style={[b.col, phone ? b.colPhone : b.colWide, isTarget && { borderColor: T.blue, backgroundColor: `${T.blue}08` }]}>
        {!phone ? (
          <View style={b.colHead}>
            <Icon name={meta.icon as any} size={17} color={meta.color} />
            <Text style={b.colTitle}>{meta.label}</Text>
            <View style={[b.count, { backgroundColor: `${meta.color}18` }]}><Text style={[b.countText, { color: meta.color }]}>{n}</Text></View>
            <View style={{ flex: 1 }} />
            {s !== 'done' ? (
              <TouchableOpacity onPress={() => onAdd(s)} style={b.add} accessibilityLabel={`Add a task in ${meta.label}`}>
                <Icon name="add" size={18} color={T.nav} />
              </TouchableOpacity>
            ) : windowPicker}
          </View>
        ) : null}
        {phone && s === 'done' ? <View style={b.winRow}><Text style={b.winLabel}>Done in the last</Text>{windowPicker}</View> : null}
        <View ref={(r) => { colRefs.current[s] = r; }} style={{ flex: 1, minHeight: 0 }} collapsable={false}>
          <ScrollView
            ref={(r) => { scrollRefs.current[s] = r; }}
            onScroll={onScrollCol(s)}
            scrollEventThrottle={32}
            scrollEnabled={!drag}
            contentContainerStyle={b.colBody}
            keyboardShouldPersistTaps="handled"
          >
            {c.ids.map((id) => {
              const t = tickets[id];
              if (!t) return null;
              const movable = canMoveCard(t, me);
              return (
                <TicketCard
                  key={id}
                  t={t}
                  onPress={onOpen}
                  draggable={movable}
                  dragHandlers={movable ? handlersFor(t, s) : undefined}
                  dimmed={drag?.id === id}
                  dense={dense}
                  onHover={Platform.OS === 'web' && !drag ? onHover : undefined}
                  onLayout={(e) => {
                    if (dragRef.current) return; // keep the measurements of the drag start
                    const l = e.nativeEvent.layout;
                    (cardY.current[s] = cardY.current[s] || {})[id] = { y: l.y, h: l.height };
                  }}
                />
              );
            })}
            {isTarget ? <View pointerEvents="none" style={[b.dropLine, { top: target!.lineY }]} /> : null}
            {c.loading && (!c.ids.length || c.more) ? <ActivityIndicator color={T.copper} style={{ marginVertical: 14 }} /> : null}
            {c.error ? (
              <TouchableOpacity onPress={() => loadColumn(s)} style={b.err}><Text style={b.errText}>{c.error} · Retry</Text></TouchableOpacity>
            ) : null}
            {c.loaded && !c.loading && !c.ids.length ? (
              <View style={b.emptyCol}>
                <Icon name={noMatch ? 'search-off' : meta.icon as any} size={22} color={T.border} />
                <Text style={b.emptyText}>{noMatch ? 'No match' : drag ? 'Drop here' : 'Nothing here'}</Text>
              </View>
            ) : null}
            {c.more && !c.loading ? <Text style={b.more}>Scroll for more…</Text> : null}
            {s === 'done' && c.loaded && !c.more && older > 0 ? (
              <TouchableOpacity onPress={onHistory} style={b.older} accessibilityRole="button">
                <Icon name="history" size={16} color={T.blue} />
                <Text style={b.olderText}>{older.toLocaleString('en-IN')} older done card{older === 1 ? '' : 's'} · open History</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </View>
    );
  };

  const ghostTicket = drag ? tickets[drag.id] : null;

  return (
    <View ref={boardRef} style={b.board} collapsable={false}>
      {phone ? (
        <View style={b.tabs}>
          {STATUSES.map((s) => {
            const on = tab === s.key;
            const drop = target?.viaTab && target.status === s.key;
            return (
              <View key={s.key} ref={(r) => { tabRefs.current[s.key] = r; }} style={{ flex: 1 }} collapsable={false}>
                <TouchableOpacity onPress={() => setTab(s.key)} style={[b.tab, on && { backgroundColor: s.color }, drop && { backgroundColor: T.blue, transform: [{ scale: 1.06 }] }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[b.tabText, (on || drop) && { color: '#fff' }]} numberOfLines={1}>{s.label}</Text>
                  <Text style={[b.tabCount, (on || drop) && { color: '#fff' }]}>{counts ? counts[s.key] : cols[s.key].ids.length}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ) : null}
      {phone && drag ? <Text style={b.dragHint}>Drop on a tab to move it to that column</Text> : null}
      <View style={[b.cols, phone && { paddingHorizontal: 0 }]}>
        {visible.map(column)}
      </View>
      {phone && cols[tab].loaded && tab !== 'done' ? (
        <TouchableOpacity style={b.fab} onPress={() => onAdd(tab)} accessibilityLabel="New task">
          <Icon name="add" size={26} color="#fff" />
        </TouchableOpacity>
      ) : null}
      {peek && !drag ? <Peek {...peek} /> : null}
      {drag && ghost && ghostTicket ? (
        <View pointerEvents="none" style={[b.ghost, { left: ghost.x, top: ghost.y, width: drag.cardW }]}>
          <TicketCard t={ghostTicket} onPress={() => {}} ghost dense={dense} />
        </View>
      ) : null}
      {!Object.values(cols).some((c) => c.loaded) ? <Empty icon="dashboard" title="Loading the board…" /> : null}
    </View>
  );
}

/** quick look at a card (web hover) — everything without opening it */
function Peek({ t, x, y }: { t: Ticket; x: number; y: number }) {
  const g: any = globalThis;
  const W = 320;
  const vw = g.innerWidth || 1200;
  const vh = g.innerHeight || 800;
  const left = Math.min(x + 16, vw - W - 12);
  const top = Math.min(y + 12, vh - 230);
  const st = statusOf(t.status);
  const side = devSideOf(t.dev_side);
  const rows: [string, string][] = [
    ['Status', st.label], ['Assigned', t.assignee?.name || 'Unassigned'],
    ...(t.client ? [['Raised by', t.client.name] as [string, string]] : [['Created by', t.created_by.name] as [string, string]]),
    ...(t.module_label ? [['Module', t.module_label] as [string, string]] : []),
    ...(side ? [['Dev side', side.label] as [string, string]] : []),
    ...(t.due_date ? [['Due', `${fmtYmd(t.due_date)}${isOverdue(t) ? ' · overdue' : ''}`] as [string, string]] : []),
    ...(t.est_min || t.spent_min ? [['Time', `${fmtMinutes(t.spent_min) || '0m'} actual · ${fmtMinutes(t.est_min || 0) || '—'} est`] as [string, string]] : []),
    ['Updated', ago(t.updated_at)],
  ];
  return (
    <View pointerEvents="none" style={[b.peek, { left, top, width: W, position: 'fixed' as any }]}>
      <Text style={b.peekNo}>{t.no}{t.kind === 'ticket' ? ' · user ticket' : ''}</Text>
      <Text style={b.peekTitle}>{t.title}</Text>
      {rows.map(([k, v]) => (
        <View key={k} style={b.peekRow}><Text style={b.peekKey}>{k}</Text><Text style={b.peekVal} numberOfLines={1}>{v}</Text></View>
      ))}
      {t.labels.length ? <Text style={b.peekLabels} numberOfLines={1}>{t.labels.join(' · ')}</Text> : null}
      <Text style={b.peekHint}>Click to open · {t.comments} comments · {t.attachments} files</Text>
    </View>
  );
}

const b = StyleSheet.create({
  peek: { zIndex: 2000, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, gap: 3, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  peekNo: { fontSize: 10.5, fontWeight: '900', color: T.muted, letterSpacing: 0.4 },
  peekTitle: { fontSize: 14, fontWeight: '900', color: T.ink, marginBottom: 6 },
  peekRow: { flexDirection: 'row', gap: 8 },
  peekKey: { width: 74, fontSize: 11.5, fontWeight: '800', color: T.muted },
  peekVal: { flex: 1, fontSize: 11.5, fontWeight: '800', color: T.ink },
  peekLabels: { fontSize: 11, fontWeight: '800', color: T.yd, marginTop: 4 },
  peekHint: { fontSize: 10.5, fontWeight: '700', color: T.muted, marginTop: 6 },
  board: { flex: 1, minHeight: 0 },
  cols: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 2 },
  col: { borderRadius: 14, backgroundColor: T.alt, borderWidth: 1, borderColor: 'transparent', overflow: 'hidden' },
  colWide: { flex: 1, minWidth: 0 },
  colPhone: { flex: 1, backgroundColor: 'transparent' },
  colHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, gap: 7, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 8 },
  colTitle: { fontSize: 13.5, fontWeight: '900', color: T.nav },
  count: { minWidth: 24, height: 20, borderRadius: 10, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 11, fontWeight: '900' },
  add: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  colBody: { paddingHorizontal: 8, paddingBottom: 80, minHeight: 160 },
  dropLine: { position: 'absolute', left: 6, right: 6, height: 4, borderRadius: 2, backgroundColor: T.blue },
  emptyCol: { alignItems: 'center', justifyContent: 'center', paddingVertical: 26, gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: T.border, borderRadius: 12, marginTop: 4 },
  emptyText: { fontSize: 12, fontWeight: '800', color: T.muted },
  more: { textAlign: 'center', color: T.muted, fontSize: 11.5, fontWeight: '700', paddingVertical: 10 },
  err: { padding: 10, alignItems: 'center' },
  errText: { color: T.red, fontWeight: '800', fontSize: 12 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tab: { height: 46, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabText: { fontSize: 11.5, fontWeight: '900', color: T.nav },
  tabCount: { fontSize: 13, fontWeight: '900', color: T.muted, marginTop: 1 },
  dragHint: { textAlign: 'center', fontSize: 11.5, fontWeight: '800', color: T.blue, marginBottom: 6 },
  ghost: { position: 'absolute', zIndex: 1000, ...(Platform.OS === 'web' ? ({ cursor: 'grabbing' } as any) : null) },
  win: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: 8, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  winBtn: { paddingHorizontal: 7, height: 24, alignItems: 'center', justifyContent: 'center' },
  winText: { fontSize: 10.5, fontWeight: '900', color: T.muted },
  winRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingBottom: 8 },
  winLabel: { fontSize: 11.5, fontWeight: '800', color: T.muted },
  older: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, marginTop: 4, borderRadius: 10, borderWidth: 1, borderColor: `${T.blue}40`, backgroundColor: `${T.blue}0A` },
  olderText: { fontSize: 12, fontWeight: '800', color: T.blue },
  fab: { position: 'absolute', right: 6, bottom: 12, width: 54, height: 54, borderRadius: 27, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
});
