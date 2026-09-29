// FILE: src/components/dashboard/ResponsiveReport.tsx
// Shared responsive helpers for the Business Dashboard AND every screen it
// opens (Monthly Target, Monthly Report, Expense, Production, Production
// machine, Collection / Outstanding flow, Sales flow, Creditor, Sales-exec,
// Party). UI ONLY — no data, API or handler logic lives here.
//
// Breakpoints follow the ERP Designing dashboard and are measured on the
// screen's CONTENT width (so the desktop sidebar is already excluded):
//   compact  < 640      phone — 1 column, full-width cards
//   medium   640 – 999  tablet — 2 columns
//   wide     ≥ 1000     desktop — 3 columns, content centred at max width
import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { columnsForWidth, DASH_GAP, DashCols } from './DashboardGrid';

export const REPORT_MAX_WIDTH = 1320;

export type ReportLayout = {
  /** measured content width (0 until the first layout) */
  width: number;
  cols: DashCols;
  compact: boolean; // phone
  medium: boolean; // tablet
  wide: boolean; // desktop
  /** attach to the outer View whose width should drive the layout */
  onLayout: (e: LayoutChangeEvent) => void;
};

/** Measures a container and returns the ERP breakpoint for it. */
export function useReportLayout(): ReportLayout {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
  }, []);
  const cols = columnsForWidth(width);
  return { width, cols, compact: cols === 1, medium: cols === 2, wide: cols === 3, onLayout };
}

/**
 * Centres page content at the ERP max width. Use INSIDE a ScrollView's
 * content (or around a screen body) — it never scrolls by itself.
 */
export function ReportContainer({
  children,
  style,
  onLayout,
  maxWidth = REPORT_MAX_WIDTH,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
  maxWidth?: number;
}) {
  return (
    <View onLayout={onLayout} style={[st.container, { maxWidth }, style]}>
      {children}
    </View>
  );
}

/**
 * Wrapping grid: children flow into `cols` equal columns (row by row) and
 * wrap. Good for KPI tiles / cards of similar height. cols = 1 -> stacked.
 */
export function ResponsiveGrid({
  cols,
  gap = DASH_GAP,
  children,
  style,
}: {
  cols: number;
  gap?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (cols <= 1) return <View style={style}>{items}</View>;
  return (
    <View style={[st.grid, { marginHorizontal: -gap / 2 }, style]}>
      {items.map((child, i) => (
        <View key={(child as any)?.key ?? i} style={{ width: `${100 / cols}%`, paddingHorizontal: gap / 2 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/**
 * Two panes side by side on medium / wide (e.g. chart | table, list | detail),
 * stacked on phone. `ratio` = left pane share on wide screens.
 */
export function SplitPane({
  layout,
  left,
  right,
  ratio = 0.5,
  gap = DASH_GAP,
}: {
  layout: Pick<ReportLayout, 'cols'>;
  left: React.ReactNode;
  right: React.ReactNode;
  ratio?: number;
  gap?: number;
}) {
  if (layout.cols <= 1) {
    return (
      <View>
        {left}
        {right}
      </View>
    );
  }
  return (
    <View style={[st.split, { gap }]}>
      <View style={{ flex: ratio, minWidth: 0 }}>{left}</View>
      <View style={{ flex: 1 - ratio, minWidth: 0 }}>{right}</View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { width: '100%', alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' },
  split: { flexDirection: 'row', alignItems: 'flex-start' },
});
