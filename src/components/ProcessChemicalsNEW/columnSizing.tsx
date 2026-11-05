// FILE: src/components/ProcessChemicalsNEW/columnSizing.tsx
// Shared column sizing for the Process Chemicals grids (Recipe grid + Browse list).
//
//  - drag the thin handle on the right edge of a header cell to resize that column
//  - a column can be made VERY narrow (MIN_COL_W is the only floor; header / cell text is clipped with an ellipsis)
//  - double-click a handle        -> autosize that column to its content
//  - right-click on the header     -> "Autosize all columns" / "Reset columns"   (web)
//  - until the user touches a column the grid keeps its normal responsive (flex) layout
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

/** Absolute smallest width (px) any column may be dragged to. Change here if you want a different floor. */
export const MIN_COL_W = 28;
const MAX_COL_W = 520;
const CELL_PAD = 24; // horizontal padding (10 + 10) + a little safety

export type ColDef = {
  key: string;
  header: string;
  /** extra room needed in the header (e.g. sort arrow) */
  extra?: number;
  /** body text of this column is bold */
  bold?: boolean;
};

export function measureText(text: string, size = 13.5, weight = '400', spacing = 0): number {
  if (!text) return 0;
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const holder = measureText as any;
    if (!holder._c) holder._c = document.createElement('canvas');
    const ctx = holder._c.getContext('2d');
    if (ctx) {
      ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
      return Math.ceil(ctx.measureText(text).width + spacing * text.length);
    }
  }
  return Math.ceil(text.length * size * 0.6 + spacing * text.length);
}

export type ColumnSizing = {
  /** px widths once the user has resized something, otherwise null (= default flex layout) */
  widths: Record<string, number> | null;
  /** sum of the widths of all columns (0 while in default layout) */
  total: number;
  /** style for a header / body / filter cell of column `key`; `base` is the default (flex or fixed) style */
  col: (key: string, base: any) => any;
  /** onLayout for a header cell (so we know the rendered width when the first drag starts) */
  onLayout: (key: string) => (e: LayoutChangeEvent) => void;
  widthOf: (key: string) => number;
  setWidth: (key: string, w: number) => void;
  autosize: (key?: string) => void;
  reset: () => void;
};

/**
 * @param defs        the columns that are currently shown (order irrelevant)
 * @param getSamples  returns every text shown in column `key` (used by autosize)
 */
export function useColumnSizing(defs: ColDef[], getSamples: (key: string) => string[]): ColumnSizing {
  const [widths, setWidths] = useState<Record<string, number> | null>(null);
  const measured = useRef<Record<string, number>>({});
  const widthsRef = useRef(widths);
  widthsRef.current = widths;
  const defsRef = useRef(defs);
  defsRef.current = defs;
  const samplesRef = useRef(getSamples);
  samplesRef.current = getSamples;

  // different column set (e.g. desktop -> tablet) -> start again from the responsive layout
  const sig = defs.map((d) => d.key).join('|');
  useEffect(() => { setWidths(null); measured.current = {}; }, [sig]);

  const minOf = useCallback((key: string) => {
    const d = defsRef.current.find((x) => x.key === key);
    if (!d) return MIN_COL_W;
    return MIN_COL_W; // user may shrink a column below its header text — the text is clipped, nothing breaks
  }, []);

  // what "Autosize" uses as the lowest width: the header text must stay readable after an autosize
  const headFit = useCallback((key: string) => {
    const d = defsRef.current.find((x) => x.key === key);
    return d ? measureText(d.header.toUpperCase(), 11, '800', 0.5) + CELL_PAD + (d.extra ?? 0) : MIN_COL_W;
  }, []);

  const clamp = useCallback((key: string, w: number) => Math.round(Math.min(MAX_COL_W, Math.max(minOf(key), w))), [minOf]);

  const current = useCallback((): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const d of defsRef.current) out[d.key] = widthsRef.current?.[d.key] ?? measured.current[d.key] ?? minOf(d.key);
    return out;
  }, [minOf]);

  const widthOf = useCallback((key: string) => current()[key] ?? MIN_COL_W, [current]);

  const setWidth = useCallback((key: string, w: number) => {
    setWidths({ ...current(), [key]: clamp(key, w) });
  }, [current, clamp]);

  const fit = useCallback((d: ColDef) => {
    let w = headFit(d.key);
    for (const s of samplesRef.current(d.key)) w = Math.max(w, measureText(s, 13.5, d.bold ? '800' : '500') + CELL_PAD);
    return clamp(d.key, w);
  }, [headFit, clamp]);

  const autosize = useCallback((key?: string) => {
    const base = current();
    for (const d of defsRef.current) if (!key || d.key === key) base[d.key] = fit(d);
    setWidths(base);
  }, [current, fit]);

  const reset = useCallback(() => { setWidths(null); }, []);

  const onLayout = useCallback((key: string) => (e: LayoutChangeEvent) => { measured.current[key] = e.nativeEvent.layout.width; }, []);

  const col = useCallback((key: string, base: any) => (widths && widths[key] != null ? { width: widths[key], flexGrow: 0, flexShrink: 0 } : base), [widths]);

  const total = useMemo(() => (widths ? defs.reduce((s, d) => s + (widths[d.key] ?? 0), 0) : 0), [widths, defs]);

  return { widths, total, col, onLayout, widthOf, setWidth, autosize, reset };
}

/** Thin drag handle that sits on the right edge of a header cell. Put it INSIDE the header cell View. */
export function ResizeHandle({ sizing, k }: { sizing: ColumnSizing; k: string }) {
  const sz = useRef(sizing);
  sz.current = sizing;
  const start = useRef(0);
  const lastTap = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { start.current = sz.current.widthOf(k); },
      onPanResponderMove: (_, g) => { if (Math.abs(g.dx) > 1) sz.current.setWidth(k, start.current + g.dx); },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < 3 && Math.abs(g.dy) < 3) {
          const now = Date.now();
          if (now - lastTap.current < 350) { lastTap.current = 0; sz.current.autosize(k); } else lastTap.current = now;
        }
      },
    }),
  ).current;
  return (
    <View {...pan.panHandlers} style={[hs.hit, Platform.OS === 'web' ? ({ cursor: 'col-resize' } as any) : null]} accessibilityLabel="Resize column">
      <View style={hs.line} />
    </View>
  );
}

/** Wraps a header row: right-click (web) opens "Autosize all columns / Reset columns". */
export function ColumnMenu({ sizing, style, children }: { sizing: ColumnSizing; style?: any; children: React.ReactNode }) {
  const ref = useRef<any>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = ref.current as any;
    if (!node || !node.addEventListener) return;
    const h = (e: MouseEvent) => { e.preventDefault(); setPos({ x: e.clientX, y: e.clientY }); };
    node.addEventListener('contextmenu', h);
    return () => node.removeEventListener('contextmenu', h);
  }, []);
  const close = () => setPos(null);
  const left = pos ? Math.max(8, Math.min(pos.x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 220)) : 0;
  const top = pos ? Math.max(8, Math.min(pos.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 110)) : 0;
  return (
    <View ref={ref} style={style}>
      {children}
      {pos ? (
        <Modal transparent visible animationType="none" onRequestClose={close}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close}>
            <View style={[ms.menu, { left, top }]}>
              <Item icon="↔" label="Autosize all columns" onPress={() => { sizing.autosize(); close(); }} />
              <Item icon="↺" label="Reset columns" onPress={() => { sizing.reset(); close(); }} />
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const Item = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} accessibilityRole="button" style={(p: any) => [ms.item, p.hovered && { backgroundColor: T.alt }]}>
    <Text style={ms.icon}>{icon}</Text>
    <Text style={ms.label}>{label}</Text>
  </Pressable>
);

const hs = StyleSheet.create({
  hit: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 12, zIndex: 5, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, height: '55%', borderRadius: 1, backgroundColor: T.border },
});
const ms = StyleSheet.create({
  menu: { position: 'absolute', minWidth: 200, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  icon: { width: 18, textAlign: 'center', color: T.copper, fontWeight: '800' },
  label: { fontSize: 13.5, color: T.ink, fontWeight: '600' },
});
