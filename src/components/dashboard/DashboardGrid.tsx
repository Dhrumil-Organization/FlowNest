// FILE: src/components/dashboard/DashboardGrid.tsx
// Responsive column layout for the Business Dashboard — same layout as the
// ERP Designing dashboard (after login → Owner):
//
//   phone   (< 640 content px)   1 column  — cards stacked
//   tablet  (640 – 999)          2 columns
//   desktop (≥ 1000)             3 columns
//
// UI ONLY. Cards are wrapped in <Slot name="..."> and placed into columns by
// name; nothing about their data, API calls or handlers changes. Slots that
// render nothing (permission off / no data) simply take no space.
import React from 'react';
import { StyleSheet, View } from 'react-native';

export type DashCols = 1 | 2 | 3;

/** Horizontal margin for dashboard SectionCards. null = legacy default (12). */
export const DashboardInsetContext = React.createContext<number | null>(null);

/** Columns for a given CONTENT width (measure with onLayout, not window width). */
export const columnsForWidth = (width: number): DashCols => (width >= 1000 ? 3 : width >= 640 ? 2 : 1);

export const DASH_GAP = 14;

/** Marks one card for DashboardGrid. Renders its children as-is. */
export function Slot({ children }: { name: string; children?: React.ReactNode }) {
  return <>{children}</>;
}

type Layout = Partial<Record<DashCols, string[][]>>;

/**
 * Places <Slot name> children into columns according to `layout[columns]`.
 * 1 column (or no layout for that count) = children in their written order.
 * A slot that the layout does not mention is appended to the last column, so
 * nothing can silently disappear.
 */
export function DashboardGrid({
  columns = 1,
  layout,
  children,
  gap = DASH_GAP,
}: {
  columns?: DashCols;
  layout: Layout;
  children: React.ReactNode;
  gap?: number;
}) {
  const list = React.Children.toArray(children);
  const plan = columns > 1 ? layout[columns] : undefined;
  if (!plan) return <>{list}</>;

  const byName = new Map<string, React.ReactNode>();
  const unnamed: React.ReactNode[] = [];
  list.forEach((child) => {
    const name = React.isValidElement(child) ? (child.props as any)?.name : undefined;
    if (name) byName.set(String(name), child);
    else unnamed.push(child);
  });

  const placed = new Set<string>();
  const cols = plan.map((names) => names.map((n) => {
    placed.add(n);
    return byName.get(n) ?? null;
  }));
  const rest = [...Array.from(byName.entries()).filter(([n]) => !placed.has(n)).map(([, el]) => el), ...unnamed];
  if (rest.length) cols[cols.length - 1] = [...cols[cols.length - 1], ...rest];

  return (
    <View style={[st.row, { gap }]}>
      {cols.map((items, i) => (
        <View key={`col-${i}`} style={st.col}>
          {items}
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', width: '100%' },
  col: { flex: 1, minWidth: 0 },
});
