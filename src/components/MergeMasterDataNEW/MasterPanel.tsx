// FILE: src/components/MergeMasterDataNEW/MasterPanel.tsx
// One panel of the Merge Master screen (MAIN on one side, MERGE on the other).
// Virtualised list with fixed row height -> stays smooth with 20,000+ accounts on phone and web.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, PanResponder, Platform, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { Breakpoint, Column, MasterRow, filterRows } from './model';
import { SkeletonRows, useDebounced } from './ui';

type Tone = 'from' | 'to';

type Props = {
  tone: Tone;
  title: string;
  subtitle: string;
  /** Columns exactly as the show-data response sends them (key = label). */
  columns: Column[];
  rows: MasterRow[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  /** `id` of the selected row (NOT the code — several rows can share one code). */
  selectedId: string;
  /** `id` of the row picked in the OTHER panel — that same row is locked here (a record cannot merge into itself). */
  blockedId: string;
  onSelect: (code: string) => void;
  disabled?: boolean;
  bp: Breakpoint;
  height: number;
};

/** Column widths (px) — user can drag the header borders to make a column narrower / wider. */
const COL_W = { codeDef: 110, otherDef: 180, min: 50, max: 600 };
const defaultWidth = (c: Column) => (c.isCode ? COL_W.codeDef : COL_W.otherDef);

/** Drag handle on the right border of a header cell. Mouse (web) and touch (tablet). Double-click / double-tap resets. */
function ResizeHandle({ width, def, onChange, accent }: { width: number; def: number; onChange: (w: number) => void; accent: string }) {
  const [hot, setHot] = useState(false);
  const start = useRef(width);
  const cur = useRef(width);
  const lastTap = useRef(0);
  const cb = useRef(onChange);
  cur.current = width;
  cb.current = onChange;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          start.current = cur.current;
          const now = Date.now();
          if (now - lastTap.current < 350) cb.current(def);
          lastTap.current = now;
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) < 2) return;
          cb.current(Math.max(COL_W.min, Math.min(COL_W.max, Math.round(start.current + g.dx))));
        },
      }),
    [def],
  );
  return (
    <View
      {...pan.panHandlers}
      {...(Platform.OS === 'web' ? ({ onMouseEnter: () => setHot(true), onMouseLeave: () => setHot(false) } as any) : null)}
      accessibilityLabel="Drag to resize column"
      style={[p.handle, Platform.OS === 'web' && ({ cursor: 'col-resize', userSelect: 'none', touchAction: 'none' } as any)]}
    >
      <View style={[p.handleLine, hot && { backgroundColor: accent, width: 2 }]} />
    </View>
  );
}

const ROW_H_WIDE = 46;
const ROW_H_PHONE = 66;

const Row = memo(function Row({
  item, on, blocked, tone, phone, onPress, columns, widths,
}: { item: MasterRow; on: boolean; blocked: boolean; tone: Tone; phone: boolean; onPress: (code: string) => void; columns: Column[]; widths: Record<string, number> }) {
  const accent = tone === 'from' ? T.amber : T.green;
  return (
    <Pressable
      onPress={() => onPress(item.id)}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={`${item.code} ${item.name}`}
      accessibilityState={{ selected: on, disabled: blocked }}
      style={({ hovered, pressed }: any) => [
        p.row,
        { height: phone ? ROW_H_PHONE : ROW_H_WIDE },
        on && { backgroundColor: T.sub, borderLeftColor: accent },
        !on && !blocked && (hovered || pressed) && { backgroundColor: T.alt },
        blocked && { opacity: 0.4 },
        Platform.OS === 'web' && ({ cursor: blocked ? 'not-allowed' : 'pointer' } as any),
      ]}
    >
      {phone ? (
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={p.code}>{item.code}</Text>
            <Text style={[p.name, on && { fontWeight: '800' }]} numberOfLines={1}>{item.name}</Text>
          </View>
        </View>
      ) : (
        <>
          {columns.map((c, i) => {
            const last = i === columns.length - 1;
            const v = item.raw?.[c.key];
            const text = v === null || v === undefined ? '' : String(v);
            return (
              <Text
                key={c.key}
                style={[
                  c.isCode ? p.code : p.name,
                  last ? { flex: 1, minWidth: 0 } : { width: widths[c.key] ?? defaultWidth(c), flexShrink: 0 },
                  !c.isCode && on && { fontWeight: '800' },
                ]}
                numberOfLines={1}
              >
                {text}
              </Text>
            );
          })}
        </>
      )}
      {on ? <Icon name="check-circle" size={20} color={accent} /> : blocked ? <Icon name="lock-outline" size={16} color={T.muted} /> : null}
    </Pressable>
  );
});

export function MasterPanel({
  tone, title, subtitle, columns, rows, loading, error, onRetry,
  selectedId, blockedId, onSelect, disabled, bp, height,
}: Props) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 160);
  const phone = bp === 'phone';
  const accent = tone === 'from' ? T.amber : T.green;
  const rowH = phone ? ROW_H_PHONE : ROW_H_WIDE;
  const [widths, setWidths] = useState<Record<string, number>>({});
  const setW = useCallback((key: string, w: number) => setWidths((cur) => ({ ...cur, [key]: w })), []);

  const shown = useMemo(() => filterRows(rows, dq), [rows, dq]);
  const selected = useMemo(() => rows.find((r) => r.id === selectedId), [rows, selectedId]);

  const press = useCallback((id: string) => { if (!disabled) onSelect(id === selectedId ? '' : id); }, [disabled, onSelect, selectedId]);

  return (
    <View style={[p.panel, S.card, { borderTopColor: accent }]} accessibilityLabel={title}>
      <View style={p.head}>
        <View style={[p.badge, { backgroundColor: accent }]}>
          <Icon name={tone === 'from' ? 'call-split' : 'call-merge'} size={16} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={p.title}>{title}</Text>
          <Text style={p.sub} numberOfLines={2}>{subtitle}</Text>
        </View>
      </View>

      <View style={p.searchBox}>
        <Icon name="search" size={18} color={T.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          editable={!disabled}
          placeholder="Search in all columns"
          placeholderTextColor={T.muted}
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel={`Search ${title}`}
          style={[p.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
        />
        {q ? <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Clear search"><Icon name="cancel" size={18} color={T.muted} /></Pressable> : null}
      </View>

      {selected ? (
        <View style={[p.chip, { borderColor: accent }]}>
          <Icon name="check-circle" size={16} color={accent} />
          <Text style={p.chipText} numberOfLines={1}><Text style={{ fontWeight: '800' }}>{selected.code}</Text>  {selected.name}</Text>
          <Pressable onPress={() => onSelect('')} disabled={disabled} hitSlop={8} accessibilityLabel="Clear selection">
            <Icon name="close" size={16} color={T.muted} />
          </Pressable>
        </View>
      ) : null}

      {!phone ? (
        <View style={p.thead}>
          {columns.map((c, i) => {
            const last = i === columns.length - 1;
            const w = widths[c.key] ?? defaultWidth(c);
            return last ? (
              <Text key={c.key} style={[p.th, { flex: 1, minWidth: 0 }]} numberOfLines={1}>{c.label}</Text>
            ) : (
              <View key={c.key} style={{ width: w, flexShrink: 0 }}>
                <Text style={p.th} numberOfLines={1}>{c.label}</Text>
                <ResizeHandle width={w} def={defaultWidth(c)} onChange={(nw) => setW(c.key, nw)} accent={accent} />
              </View>
            );
          })}
          <View style={{ width: 20 }} />
        </View>
      ) : null}

      <View style={{ height }}>
        {loading ? (
          <SkeletonRows count={Math.max(4, Math.floor(height / rowH))} height={rowH} />
        ) : error ? (
          <View style={p.center}>
            <Icon name="cloud-off" size={30} color={T.red} />
            <Text style={p.errText}>{error}</Text>
            <Pressable onPress={onRetry} style={p.retry} accessibilityRole="button"><Text style={p.retryText}>Retry</Text></Pressable>
          </View>
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(i, idx) => `${idx}:${i.code}`}
            extraData={`${selectedId}|${blockedId}|${JSON.stringify(widths)}|${columns.length}`}
            getItemLayout={(_, index) => ({ length: rowH, offset: rowH * index, index })}
            initialNumToRender={Math.ceil(height / rowH) + 4}
            maxToRenderPerBatch={24}
            windowSize={9}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={p.center}>
                <Icon name="inbox" size={28} color={T.muted} />
                <Text style={p.empty}>{rows.length ? 'No record matches your search' : 'No records for this property'}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Row item={item} on={item.id === selectedId} blocked={item.id === blockedId} tone={tone} phone={phone} onPress={press} columns={columns} widths={widths} />
            )}
          />
        )}
      </View>

      <View style={p.foot}>
        <Text style={p.footText}>{loading ? 'Loading…' : `${shown.length.toLocaleString()} of ${rows.length.toLocaleString()} records`}</Text>
      </View>
    </View>
  );
}

const p = StyleSheet.create({
  panel: { flex: 1, minWidth: 0, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, borderTopWidth: 4, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 8 },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  title: { color: T.ink, fontSize: 15, fontWeight: '800' },
  sub: { color: T.muted, fontSize: 12, marginTop: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 10, minHeight: 42, backgroundColor: T.sub },
  searchInput: { flex: 1, color: T.ink, fontSize: 14, paddingVertical: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, backgroundColor: T.surface },
  chipText: { flex: 1, color: T.ink, fontSize: 13 },
  thead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: T.sub, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.hair },
  handle: { position: 'absolute', right: -9, top: -7, bottom: -7, width: 16, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  handleLine: { width: 1, height: '70%', backgroundColor: T.border },
  th: { color: T.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hair, borderLeftWidth: 4, borderLeftColor: 'transparent' },
  code: { color: T.muted, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  name: { color: T.ink, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  addr: { color: T.muted, fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  empty: { color: T.muted, fontSize: 13, textAlign: 'center' },
  errText: { color: T.red, fontSize: 13, textAlign: 'center' },
  retry: { marginTop: 4, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: T.border },
  retryText: { color: T.ink, fontWeight: '800', fontSize: 13 },
  foot: { paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.hair, backgroundColor: T.sub },
  footText: { color: T.muted, fontSize: 11, fontWeight: '700' },
});
